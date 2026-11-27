import { randomUUID } from 'node:crypto';
import { closeSync, fchmodSync, lstatSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { readCatalog } from './configure-agents-catalog.mjs';

let applyEdits, modify, parseTOML, isMap, isScalar, parseDocument;

const team = ['coordinator', 'documenter', 'coder', 'qa', 'pr-reviewer'];
const writer = 'codex-writer';
const claudeSettings = '.claude/settings.json';
const codexSettings = '.codex/config.toml';

function destination(client, role) {
  if (client === 'codex') {
    return { path: role === 'coordinator' ? codexSettings : `.codex/agents/${role}.toml`,
      modelKey: ['model'], effortKey: ['model_reasoning_effort'] };
  }
  if (role === writer) {
    return { path: claudeSettings, modelKey: ['env', 'HARNESS_CODEX_WRITER_MODEL'],
      effortKey: ['env', 'HARNESS_CODEX_WRITER_EFFORT'] };
  }
  return { path: role === 'coordinator' ? claudeSettings : `.claude/agents/${role}.md`,
    modelKey: ['model'], effortKey: [role === 'coordinator' ? 'effortLevel' : 'effort'] };
}

function snapshot(path) {
  const absolute = resolve(path);
  const parent = dirname(absolute);
  if (realpathSync(parent) !== parent) throw new Error(`Expected a regular directory for ${path}.`);
  try {
    const stat = lstatSync(path);
    if (!stat.isFile()) throw new Error(`Expected a regular file at ${path}.`);
    return { content: readFileSync(path, 'utf8'), mode: stat.mode & 0o777 };
  } catch (error) {
    if (error.code !== 'ENOENT' || path !== codexSettings) throw error;
    return { content: null, mode: 0o666 };
  }
}

const lineEnding = content => content.includes('\r\n') ? '\r\n' : '\n';

function spliceEdits(content, edits) {
  for (const [start, end, value] of edits.sort((a, b) => b[0] - a[0] || b[1] - a[1])) {
    content = content.slice(0, start) + value + content.slice(end);
  }
  return content;
}

function readToml(source) {
  const root = parseTOML(source).body[0].body;
  const values = new Map();
  let firstTable;
  for (const node of root) {
    if (node.type === 'TOMLTable') {
      firstTable = node.range[0];
      break;
    }
    if (node.key.keys.length === 1) {
      const key = node.key.keys[0];
      values.set(key.name ?? key.value, node.value);
    }
  }
  return {
    read: ([key]) => values.get(key)?.value,
    edit(changes) {
      const edits = [];
      const insertions = [];
      const eol = lineEnding(source);
      for (const [[key], value] of changes) {
        const existing = values.get(key);
        if (existing?.value === value) continue;
        const literal = JSON.stringify(value);
        if (existing) edits.push([...existing.range, literal]);
        else insertions.push(`${key} = ${literal}`);
      }
      if (insertions.length) {
        // A missing root key belongs before tables, which can themselves contain a model key.
        const offset = firstTable === undefined ? source.length : source.lastIndexOf('\n', firstTable - 1) + 1;
        const prefix = offset > 0 && source[offset - 1] !== '\n' ? eol : '';
        edits.push([offset, offset, prefix + insertions.join(eol) + eol + (firstTable === undefined ? '' : eol)]);
      }
      return spliceEdits(source, edits);
    },
  };
}

function readFrontmatter(source) {
  const match = /^(\uFEFF?---[ \t]*\r?\n)([\s\S]*?)(^---[ \t]*(?:\r?\n|$))/m.exec(source);
  if (!match || match.index !== 0) throw new Error('Agent definition requires YAML frontmatter.');
  const [header, opening, yaml, closing] = match;
  const document = parseDocument(yaml);
  if (document.errors.length || !isMap(document.contents)) throw new Error('Expected YAML mapping.');
  return {
    read: ([key]) => document.get(key),
    edit(changes) {
      const edits = [];
      const insertions = [];
      const eol = lineEnding(opening);
      const pending = changes.filter(([[key], value]) => document.get(key) !== value);
      if (!pending.length) return source;
      const rewrite = document.contents.flow || pending.some(([[key]]) => {
        const node = document.get(key, true);
        return document.has(key) && (!isScalar(node) || node.range?.[0] === node.range?.[1]);
      });
      if (rewrite) {
        for (const [[key], value] of pending) document.set(key, value);
        return opening + document.toString({ lineWidth: 0 }).replace(/\n/g, eol) + closing + source.slice(header.length);
      }
      for (const [[key], value] of pending) {
        const literal = JSON.stringify(value);
        const node = document.get(key, true);
        if (node) edits.push([node.range[0], node.range[1], literal]);
        else insertions.push(`${key}: ${literal}${eol}`);
      }
      const updated = spliceEdits(yaml, edits) + insertions.join('');
      return opening + updated + closing + source.slice(header.length);
    },
  };
}

function readJson(source) {
  const settings = JSON.parse(source);
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Expected JSON object.');
  return {
    read: keys => keys.reduce((object, key) => object?.[key], settings),
    edit(changes) {
      let updated = source;
      const indent = /^([ \t]+)"/m.exec(source)?.[1] ?? '  ';
      const formattingOptions = { insertSpaces: !indent.includes('\t'), tabSize: indent.length, eol: lineEnding(source) };
      for (const [keys, value] of changes) {
        if (keys.reduce((object, key) => object?.[key], settings) === value) continue;
        if (keys.length > 1 && Object.hasOwn(settings, keys[0])) {
          const parent = settings[keys[0]];
          if (!parent || typeof parent !== 'object' || Array.isArray(parent)) throw new Error('Expected a settings object.');
        }
        updated = applyEdits(updated, modify(updated, keys, value, { formattingOptions }));
      }
      return updated;
    },
  };
}

function parse(path, content) {
  try {
    if (path.endsWith('.toml')) return readToml(content ?? '');
    if (path.endsWith('.md')) return readFrontmatter(content);
    return readJson(content);
  } catch {
    // Parser errors can quote file contents. Only report the path.
    throw new Error(`Could not parse ${path}.`);
  }
}

async function inspect(client, scope) {
  let roles = scope === 'all' ? team : [scope];
  if (client === 'claude' && scope === 'all') {
    const config = parse(claudeSettings, snapshot(claudeSettings).content);
    if (config.read(['env', 'HARNESS_CODEX_WRITER_ENABLED']) === '1') roles = [...roles, writer];
  }
  const current = {};
  for (const role of roles) {
    const { path, modelKey, effortKey } = destination(client, role);
    const settings = parse(path, snapshot(path).content);
    const model = settings.read(modelKey);
    const effort = settings.read(effortKey);
    current[role] = { model: typeof model === 'string' ? model : null, effort: typeof effort === 'string' ? effort : null };
  }
  const clients = new Set(roles.map(role => role === writer ? 'codex' : client));
  const catalogs = await Promise.all([...clients].map(async target => [target, await readCatalog(target)]));
  return { roles: current, catalogs: Object.fromEntries(catalogs) };
}

function prepare(client, choices) {
  if (!choices || typeof choices !== 'object' || Array.isArray(choices) || !Object.keys(choices).length) {
    throw new Error('Provide one or more role choices as a JSON object.');
  }
  const files = new Map();
  const roles = {};
  for (const [role, config] of Object.entries(choices)) {
    if (!isRole(client, role)) throw new Error('Unknown role for the selected client.');
    const { model, effort = 'high' } = config ?? {};
    if (typeof model !== 'string' || !/^[\w][\w.:/@+\[\]-]*$/u.test(model)) {
      throw new Error(`Provide an exact model ID for ${role}.`);
    }
    if (typeof effort !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(effort)) {
      throw new Error(`Provide a supported effort for ${role}.`);
    }
    if (client === 'claude' && role !== writer) {
      const levels = ['low', 'medium', 'high', 'xhigh'];
      if (role !== 'coordinator') levels.push('max');
      if (!levels.includes(effort)) throw new Error(`Unsupported Claude effort for ${role}.`);
    }
    const { path, modelKey, effortKey } = destination(client, role);
    if (!files.has(path)) files.set(path, []);
    files.get(path).push([modelKey, model], [effortKey, effort]);
    roles[role] = { model, effort, path };
  }
  return { files, roles };
}

function save(files) {
  const updates = [];
  const saved = [];
  try {
    for (const [path, changes] of files) {
      const before = snapshot(path);
      const updated = parse(path, before.content).edit(changes);
      const check = parse(path, updated);
      if (changes.some(([keys, value]) => check.read(keys) !== value)) {
        throw new Error(`Could not verify the requested settings in ${path}.`);
      }
      if (updated !== before.content) {
        const temporary = `${path}.${randomUUID()}.tmp`;
        const file = openSync(temporary, 'wx', before.mode);
        updates.push({ path, before, updated, temporary });
        try {
          writeFileSync(file, updated);
          if (before.content !== null) fchmodSync(file, before.mode);
        } finally {
          closeSync(file);
        }
      }
    }
    for (const update of updates) {
      if (snapshot(update.path).content !== update.before.content) {
        throw new Error(`Configuration changed while preparing ${update.path}. Run the command again.`);
      }
      renameSync(update.temporary, update.path);
      saved.push(update);
    }
  } catch (error) {
    const failed = [];
    for (const { path, before, updated } of saved.reverse()) {
      try {
        if (snapshot(path).content !== updated) throw new Error('Concurrent change.');
        if (before.content === null) rmSync(path);
        else writeFileSync(path, before.content);
      } catch {
        failed.push(path);
      }
    }
    if (failed.length) throw new Error(`${error.message} Check these files manually: ${failed.join(', ')}.`);
    throw error;
  } finally {
    for (const { temporary } of updates) rmSync(temporary, { force: true });
  }
  return updates.map(({ path }) => path);
}

function isRole(client, role) {
  return team.includes(role) || (client === 'claude' && role === writer);
}

try {
  const [action, client, scope = 'all', ...extra] = process.argv.slice(2);
  if (!['codex', 'claude'].includes(client) || extra.length ||
      (action === 'inspect' && scope !== 'all' && !isRole(client, scope)) ||
      (action !== 'inspect' && process.argv.length !== 4) || !['inspect', 'catalog', 'apply'].includes(action)) {
    throw new Error('Usage: node scripts/configure-agents.mjs inspect <codex|claude> [role|all], catalog <codex|claude>, or apply <codex|claude> < choices.json');
  }
  if (action !== 'catalog') {
    try {
      const [jsonc, toml, yaml] = await Promise.all([import('jsonc-parser'), import('toml-eslint-parser'), import('yaml')]);
      ({ applyEdits, modify } = jsonc);
      ({ parseTOML } = toml);
      ({ isMap, isScalar, parseDocument } = yaml);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      throw new Error('Run npm ci at the repository root to install the configuration parsers.');
    }
  }
  if (action === 'inspect') {
    console.log(JSON.stringify(await inspect(client, scope)));
  } else if (action === 'catalog') {
    console.log(JSON.stringify(await readCatalog(client)));
  } else {
    const { files, roles } = prepare(client, JSON.parse(readFileSync(0, 'utf8')));
    const changed = save(files);
    console.log(JSON.stringify({ roles, changed }));
  }
} catch (error) {
  console.error(error instanceof SyntaxError ? 'Invalid choices JSON.' : error.message);
  process.exitCode = 1;
}
