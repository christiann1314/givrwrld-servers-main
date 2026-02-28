#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { validateEnv } from '../api/lib/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root and API env files if present
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../api/.env') });

function isSensitiveKey(key) {
  return /SECRET|PASSWORD|PASS|TOKEN|KEY/i.test(key);
}

async function main() {
  try {
    const env = validateEnv();
    console.log('Environment config check: OK\n');
    Object.entries(env).forEach(([key, value]) => {
      const display = isSensitiveKey(key) ? '<hidden>' : String(value);
      console.log(`${key}=${display}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Environment config check FAILED:');
    console.error(err?.message || err);
    process.exit(1);
  }
}

main();

