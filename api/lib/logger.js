/**
 * Structured logging (pino) with secret redaction.
 * Writes to logs/api.log when LOG_TO_FILE is set or in production.
 */
import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'client_secret',
  'PAYPAL_CLIENT_SECRET',
  'MYSQL_PASSWORD',
  'AES_KEY',
  'PANEL_APP_KEY',
  'token',
  'access_token',
  'refresh_token',
];

const logToFile = process.env.LOG_TO_FILE === 'true' || process.env.NODE_ENV === 'production';
const logDir = path.resolve(process.cwd(), 'logs');
const logFilePath = path.join(logDir, 'api.log');

function getStream() {
  if (!logToFile) return process.stdout;
  try {
    fs.mkdirSync(logDir, { recursive: true });
    return pino.destination({ dest: logFilePath, append: true, mkdir: true });
  } catch (e) {
    return process.stdout;
  }
}

export function createLogger(opts = {}) {
  return pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    redact: REDACT_PATHS,
    ...opts,
  }, getStream());
}

const defaultLogger = createLogger();

export function getLogger() {
  return defaultLogger;
}

export default defaultLogger;
