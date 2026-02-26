/**
 * Shared logger for API + agents: JSON lines to stdout and ./logs/app.log.
 * Fields: ts, level, service, event, order_id?, node_id?, req_id?, run_id?, details
 * Simple size-based rotate: when app.log exceeds MAX_FILE_BYTES, rename and start fresh.
 */
import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

function ensureDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (_) {}
}

function rotateIfNeeded() {
  try {
    const st = fs.statSync(LOG_FILE);
    if (st.size >= MAX_FILE_BYTES) {
      const backup = path.join(LOG_DIR, `app.${Date.now()}.log`);
      fs.renameSync(LOG_FILE, backup);
    }
  } catch (_) {}
}

/**
 * @param {object} opts - { service, req_id?, run_id?, order_id?, node_id? }
 * @param {string} level - 'info' | 'warn' | 'error'
 * @param {string} event - event name
 * @param {object} [details] - extra data (no secrets)
 */
export function log(opts, level, event, details = undefined) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    service: opts.service ?? 'api',
    event,
    ...(opts.req_id != null && { req_id: opts.req_id }),
    ...(opts.run_id != null && { run_id: opts.run_id }),
    ...(opts.order_id != null && { order_id: opts.order_id }),
    ...(opts.node_id != null && { node_id: opts.node_id }),
    ...(details != null && Object.keys(details).length > 0 && { details }),
  };
  const line = JSON.stringify(payload) + '\n';
  process.stdout.write(line);
  ensureDir();
  rotateIfNeeded();
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {
    process.stderr.write(`sharedLogger append failed: ${e.message}\n`);
  }
}

/**
 * Create a logger bound to a service and optional correlation ids.
 * @param {string} service - 'api' | 'agents'
 * @param {{ req_id?: string, run_id?: string }} [correlation]
 */
export function createServiceLogger(service, correlation = {}) {
  const base = { service, ...correlation };
  return {
    info(event, details) {
      log(base, 'info', event, details);
    },
    warn(event, details) {
      log(base, 'warn', event, details);
    },
    error(event, details) {
      log(base, 'error', event, details);
    },
  };
}

export default { log, createServiceLogger };
