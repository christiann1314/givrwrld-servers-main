#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root and API env files if present
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../api/.env') });

const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'app_core';

async function main() {
  console.log('[db-seed-ptero] Connecting to MySQL...');

  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
  });

  try {
    console.log(`[db-seed-ptero] Ensuring database "${MYSQL_DATABASE}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`;`);
    await connection.query(`USE \`${MYSQL_DATABASE}\`;`);

    const seedPath = path.join(__dirname, '../sql/seed-ptero-local.sql');
    console.log(`[db-seed-ptero] Applying seed from ${seedPath}...`);
    const sql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(sql);

    console.log('[db-seed-ptero] Completed successfully.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('[db-seed-ptero] FAILED:', err?.message || err);
  process.exit(1);
});

