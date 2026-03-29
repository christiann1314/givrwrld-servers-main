#!/usr/bin/env node
/**
 * Apply a .sql file using api/.env DB settings (multiple statements OK).
 * Usage: node api/scripts/apply-sql-file.js path/to/file.sql
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const file = process.argv[2];
if (!file) {
  console.error('Usage: node api/scripts/apply-sql-file.js <path/to/file.sql>');
  process.exit(1);
}

const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
const sql = fs.readFileSync(abs, 'utf8');

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'app_core',
  multipleStatements: true,
});

try {
  await conn.query(sql);
  console.log('Applied:', abs);
} finally {
  await conn.end();
}
