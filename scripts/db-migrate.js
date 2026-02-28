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
  console.log('[db-migrate] Connecting to MySQL...');

  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
  });

  try {
    console.log(`[db-migrate] Ensuring database "${MYSQL_DATABASE}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`;`);
    await connection.query(`USE \`${MYSQL_DATABASE}\`;`);

    const schemaPath = path.join(__dirname, '../sql/app_core.sql');
    console.log(`[db-migrate] Applying schema from ${schemaPath}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('[db-migrate] Base schema applied.');

    const migrationsDir = path.join(__dirname, '../sql/migrations');
    let files = [];
    try {
      files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.toLowerCase().endsWith('.sql'))
        .sort();
    } catch {
      // No migrations directory or files; treat as empty.
    }

    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      console.log(`[db-migrate] Applying migration ${file}...`);
      const sql = fs.readFileSync(fullPath, 'utf8');
      await connection.query(sql);
    }

    console.log('[db-migrate] Completed successfully.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('[db-migrate] FAILED:', err?.message || err);
  process.exit(1);
});

