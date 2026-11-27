import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const command = fileURLToPath(new URL('./configure-agents.mjs', import.meta.url));

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'test-configure-agents-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  for (const folder of ['.codex/agents', '.claude/agents']) mkdirSync(join(cwd, folder), { recursive: true });
  return {
    cwd,
    write: (path, content, mode) => writeFileSync(join(cwd, path), content, { mode }),
    read: path => readFileSync(join(cwd, path), 'utf8'),
    run(args, input, env) {
      return spawnSync(process.execPath, [command, ...args], {
        cwd, encoding: 'utf8', input: input === undefined ? undefined : JSON.stringify(input),
        env: { ...process.env, ...env },
      });
    },
  };
}

function success(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('creates the Codex coordinator and updates only the selected top-level TOML values', t => {
  const repo = fixture(t);
  const coder = `# Keep this comment\n"model" = "previous"  # selected coder\nnotes = """\n[looks-like-a-table]\n"""\n\n[options]\nmodel = "nested"\n`;
  repo.write('.codex/agents/coder.toml', coder);
  repo.write('.codex/agents/qa.toml', 'model = "qa-original"\n');
  const choices = { coordinator: { model: 'team-model' }, coder: { model: 'writer-model', effort: 'medium' } };

  const result = success(repo.run(['apply', 'codex'], choices));
  assert.deepEqual(result.changed, ['.codex/config.toml', '.codex/agents/coder.toml']);
  assert.equal(repo.read('.codex/config.toml'), 'model = "team-model"\nmodel_reasoning_effort = "high"\n');
  assert.equal(repo.read('.codex/agents/coder.toml'), coder
    .replace('"previous"', '"writer-model"')
    .replace('[options]', 'model_reasoning_effort = "medium"\n\n[options]'));
  assert.equal(repo.read('.codex/agents/qa.toml'), 'model = "qa-original"\n');
  assert.deepEqual(success(repo.run(['apply', 'codex'], choices)).changed, []);
});

test('preserves Claude frontmatter, agent instructions and unrelated project settings', t => {
  const repo = fixture(t);
  const settings = {
    env: { HARNESS_CODEX_WRITER_ENABLED: '0', UNRELATED: 'keep' },
    permissions: { deny: ['Bash(git push *)'] },
  };
  const agent = '---\r\nname: coder\r\nmodel: sonnet # current setting\r\nnotes: >-\r\n  keep this\r\n---\r\n# Keep instructions.\r\n';
  repo.write('.claude/settings.json', JSON.stringify(settings, null, 2) + '\n');
  repo.write('.claude/agents/coder.md', agent);

  success(repo.run(['apply', 'claude'], {
    coordinator: { model: 'opus' },
    coder: { model: 'sonnet[1m]' },
    'codex-writer': { model: 'provider/writer@2026', effort: 'medium' },
  }));

  assert.deepEqual(JSON.parse(repo.read('.claude/settings.json')), {
    ...settings,
    model: 'opus',
    effortLevel: 'high',
    env: {
      ...settings.env, HARNESS_CODEX_WRITER_MODEL: 'provider/writer@2026', HARNESS_CODEX_WRITER_EFFORT: 'medium',
    },
  });
  assert.equal(repo.read('.claude/agents/coder.md'), agent.replace('model: sonnet', 'model: "sonnet[1m]"')
    .replace('\r\n---\r\n#', '\r\neffort: "high"\r\n---\r\n#'));
});

test('rejects a bad role or malformed target before writing any choices', t => {
  const repo = fixture(t);
  repo.write('.codex/agents/coder.toml', 'model = "old"\n');
  repo.write('.codex/agents/qa.toml', 'model = "unclosed\n');
  for (const choices of [
    { coordinator: { model: 'new' }, coder: { model: '--flag' } },
    { coordinator: { model: 'new' }, 'codex-writer': { model: 'unsupported-role' } },
    { coordinator: { model: 'new' }, coder: { model: 'other' }, qa: { model: 'broken' } },
  ]) {
    assert.equal(repo.run(['apply', 'codex'], choices).status, 1);
    assert.equal(repo.read('.codex/agents/coder.toml'), 'model = "old"\n');
    assert.deepEqual(readdirSync(join(repo.cwd, '.codex')), ['agents']);
    assert.deepEqual(readdirSync(join(repo.cwd, '.codex/agents')).sort(), ['coder.toml', 'qa.toml']);
  }
});

test('follows Codex catalog pages, excludes hidden models and reports only selected roles', {
  skip: process.platform === 'win32',
}, t => {
  const repo = fixture(t);
  repo.write('.codex/agents/coder.toml', 'model = "old"\n');
  repo.write('fake-codex', `#!/usr/bin/env node
const { createInterface } = require('node:readline');
const reply = value => console.log(JSON.stringify(value));
createInterface({ input: process.stdin }).on('line', line => {
  const request = JSON.parse(line);
  if (request.method === 'initialize') return reply({ id: request.id, result: {} });
  if (request.method === 'initialized') return;
  if (request.method !== 'model/list' || request.params.includeHidden !== false) process.exit(1);
  if (!request.params.cursor) {
    reply({ id: request.id, result: {
      data: [{ model: 'writer', displayName: 'Writer', supportedReasoningEfforts: [{ reasoningEffort: 'high' }] },
             { model: 'hidden', displayName: 'Hidden', hidden: true }],
      nextCursor: 'page-two'
    } });
  } else {
    reply({ id: request.id, result: { data: [{ model: 'other' }], nextCursor: null } });
  }
});\n`, 0o755);

  const result = success(repo.run(['inspect', 'codex', 'coder'], undefined,
    { CONFIGURE_AGENTS_CODEX_BIN: join(repo.cwd, 'fake-codex') }));
  assert.deepEqual(result.roles, { coder: { model: 'old', effort: null } });
  assert.deepEqual(result.catalogs.codex, { status: 'available', models: [
    { id: 'writer', name: 'Writer', efforts: ['high'] }, { id: 'other', name: 'other', efforts: null },
  ] });
});

test('handles a missing catalog without prompting and distinguishes permission errors', {
  skip: process.platform === 'win32',
}, t => {
  const repo = fixture(t);
  const result = success(repo.run(['catalog', 'claude'], undefined,
    { CONFIGURE_AGENTS_CLAUDE_BIN: join(repo.cwd, 'missing-client') }));
  assert.deepEqual(result, { status: 'unavailable', models: [] });
  repo.write('blocked-codex', '#!/usr/bin/env node\nconsole.error("Operation not permitted"); process.exitCode = 1;\n', 0o755);
  const blocked = success(repo.run(['catalog', 'codex'], undefined,
    { CONFIGURE_AGENTS_CODEX_BIN: join(repo.cwd, 'blocked-codex') }));
  assert.deepEqual(blocked, { status: 'permission-denied', models: [] });
});

test('reads the Claude catalog in one initialization without creating a model turn', {
  skip: process.platform === 'win32',
}, t => {
  const repo = fixture(t);
  repo.write('fake-claude', `#!/usr/bin/env node
const { createInterface } = require('node:readline');
createInterface({ input: process.stdin }).on('line', line => {
  const message = JSON.parse(line);
  if (message.type !== 'control_request' || message.request?.subtype !== 'initialize') process.exit(1);
  console.log(JSON.stringify({ type: 'control_response', response: { subtype: 'success', request_id: message.request_id,
    response: { account: { apiProvider: 'firstParty', tokenSource: process.env.TEST_TOKEN_SOURCE },
                models: [{ value: 'sonnet', displayName: 'Sonnet', supportedEffortLevels: ['high'] },
                          { value: 'special', supportsEffort: false }] } } }));
});\n`, 0o755);
  const env = { CONFIGURE_AGENTS_CLAUDE_BIN: join(repo.cwd, 'fake-claude'), TEST_TOKEN_SOURCE: 'oauth' };
  const result = success(repo.run(['catalog', 'claude'], undefined, env));
  assert.deepEqual(result, { status: 'available', models: [
    { id: 'sonnet', name: 'Sonnet', efforts: ['high'] }, { id: 'special', name: 'special', efforts: [] },
  ] });
  const unauthenticated = success(repo.run(['catalog', 'claude'], undefined, { ...env, TEST_TOKEN_SOURCE: 'none' }));
  assert.deepEqual(unauthenticated, { status: 'unavailable', models: [] });
});

test('inspects all shipped Claude team definitions and reports an enabled optional writer', t => {
  const repo = fixture(t);
  const names = ['settings.json', 'agents/documenter.md', 'agents/coder.md', 'agents/qa.md', 'agents/pr-reviewer.md'];
  for (const name of names) {
    repo.write(`.claude/${name}`, readFileSync(new URL(`../.claude/${name}`, import.meta.url), 'utf8'));
  }
  const result = success(repo.run(['inspect', 'claude'], undefined, {
    CONFIGURE_AGENTS_CLAUDE_BIN: join(repo.cwd, 'missing-client'),
    CONFIGURE_AGENTS_CODEX_BIN: join(repo.cwd, 'missing-client'),
  }));
  const settings = JSON.parse(repo.read('.claude/settings.json'));
  const roles = ['coordinator', 'documenter', 'coder', 'qa', 'pr-reviewer'];
  if (settings.env.HARNESS_CODEX_WRITER_ENABLED === '1') {
    roles.push('codex-writer');
    assert.equal(result.roles['codex-writer'].model, settings.env.HARNESS_CODEX_WRITER_MODEL);
    assert.equal(result.catalogs.codex.status, 'unavailable');
  }
  assert.deepEqual(Object.keys(result.roles), roles);
  assert.deepEqual(result.catalogs.claude, { status: 'unavailable', models: [] });
});
