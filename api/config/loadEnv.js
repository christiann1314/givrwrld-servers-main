/**
 * Load api/.env before other modules read process.env (workers, one-off scripts).
 * override: PM2/shell may export PAYPAL_* etc.; the file must win.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// PM2 `pm2 save` / shell often inject PAYPAL_* (e.g. SANDBOX=false). dotenv does not unset missing keys,
// so strip PayPal vars first; api/.env becomes the single source of truth for this prefix.
for (const key of Object.keys(process.env)) {
  if (key.startsWith('PAYPAL_')) {
    delete process.env[key];
  }
}

dotenv.config({ path: path.join(__dirname, '../.env'), override: true });
