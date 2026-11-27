import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

function codexBinary() {
  if (process.env.CONFIGURE_AGENTS_CODEX_BIN) return process.env.CONFIGURE_AGENTS_CODEX_BIN;
  if (process.platform === 'darwin') {
    for (const directory of ['/Applications', join(homedir(), 'Applications')]) {
      for (const app of ['ChatGPT.app', 'Codex.app']) {
        const binary = join(directory, app, 'Contents', 'Resources', 'codex-cli', 'bin', 'codex');
        if (existsSync(binary)) return binary;
      }
    }
  }
  return 'codex';
}

// Perform a single bounded metadata handshake. No user prompt is sent to either client.
async function query(command, args, start, receive) {
  const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const closed = new Promise(resolve => child.once('close', resolve));
  child.stdin.on('error', () => {}); // A failed or timed-out subprocess can close stdin first.
  const send = data => child.stdin.write(JSON.stringify(data) + '\n');
  const lines = createInterface({ input: child.stdout });
  let timeout;
  let permissionDenied = false;
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => {
    if (/operation not permitted|permission denied/i.test(chunk)) permissionDenied = true;
  });
  try {
    return await new Promise((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('Catalog request timed out.')), 4000);
      child.once('error', reject);
      child.once('close', () => reject(new Error('Client closed before returning its catalog.')));
      lines.on('line', line => {
        try {
          const message = JSON.parse(line);
          const models = receive(message, send);
          if (models) resolve(models);
        } catch (error) {
          reject(error);
        }
      });
      send(start);
    });
  } catch (error) {
    if (permissionDenied) error.code = 'EACCES';
    throw error;
  } finally {
    clearTimeout(timeout);
    lines.close();
    child.kill('SIGKILL');
    await closed;
  }
}

async function codexCatalog() {
  const state = await mkdtemp(join(tmpdir(), 'harness-codex-catalog-'));
  try {
    const models = [];
    const cursors = new Set();
    let requestId = 1;
    return await query(codexBinary(), ['app-server', '-c', `sqlite_home=${JSON.stringify(state)}`], {
      id: 0,
      method: 'initialize',
      params: { clientInfo: { name: 'harness_configure_agents', title: 'Harness Configure Agents', version: '1.0.0' } },
    }, (message, send) => {
      if (message.id === 0) {
        if (message.error) throw new Error('Codex could not initialize.');
        send({ method: 'initialized' });
        send({ id: requestId, method: 'model/list', params: { includeHidden: false } });
      } else if (message.id === requestId) {
        const { data, nextCursor } = message.result ?? {};
        if (!Array.isArray(data)) throw new Error('Codex catalog is unavailable.');
        models.push(...data.filter(model => !model.hidden).map(model => ({
          id: model.model,
          name: model.displayName,
          efforts: model.supportedReasoningEfforts?.map(option => option.reasoningEffort),
        })));
        if (!nextCursor) return models;
        if (cursors.has(nextCursor)) throw new Error('Codex repeated a catalog page.');
        cursors.add(nextCursor);
        requestId += 1;
        send({ id: requestId, method: 'model/list', params: { includeHidden: false, cursor: nextCursor } });
      }
    });
  } finally {
    await rm(state, { recursive: true, force: true });
  }
}

function claudeCatalog() {
  const args = ['--print', '--input-format', 'stream-json', '--output-format', 'stream-json',
    '--verbose', '--no-session-persistence', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}'];
  return query(process.env.CONFIGURE_AGENTS_CLAUDE_BIN || 'claude', args, {
    type: 'control_request',
    request_id: 'catalog',
    request: { subtype: 'initialize' },
  }, message => {
    if (message.type !== 'control_response' || message.response?.request_id !== 'catalog') return;
    const { subtype, response } = message.response;
    if (subtype !== 'success' || !Array.isArray(response?.models)) throw new Error('Claude catalog is unavailable.');
    const { apiProvider, tokenSource } = response.account ?? {};
    if (apiProvider === 'firstParty' && tokenSource === 'none') {
      throw new Error('The Claude catalog has no authenticated account.');
    }
    return response.models.map(model => ({
      id: model.value,
      name: model.displayName,
      efforts: model.supportsEffort === false ? [] : model.supportedEffortLevels,
    }));
  });
}

export async function readCatalog(client) {
  try {
    const models = await (client === 'codex' ? codexCatalog() : claudeCatalog());
    const byId = new Map();
    for (const { id, name, efforts } of models) {
      if (typeof id !== 'string' || !id || byId.has(id)) continue;
      byId.set(id, {
        id,
        name: typeof name === 'string' && name ? name : id,
        // null means the provider didn't advertise effort metadata. An empty list means no levels.
        efforts: Array.isArray(efforts) ? [...new Set(efforts.filter(value => typeof value === 'string'))] : null,
      });
    }
    return { models: [...byId.values()], status: byId.size ? 'available' : 'unavailable' };
  } catch (error) {
    const blocked = ['EACCES', 'EPERM'].includes(error.code);
    return { models: [], status: blocked ? 'permission-denied' : 'unavailable' };
  }
}
