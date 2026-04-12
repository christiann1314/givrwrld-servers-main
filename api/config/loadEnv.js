/**
 * Load api/.env before other modules read process.env (workers, one-off scripts).
 * override: PM2/shell may export PAYPAL_* etc.; the file must win.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });
