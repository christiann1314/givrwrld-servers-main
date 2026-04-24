#!/usr/bin/env node
/**
 * Apply sql/migrations/20260424203000_streamer_suite_schema.sql (requires multipleStatements).
 * Usage: node api/scripts/apply-streamer-suite-migration.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import '../config/loadEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, '../../sql/migrations/20260424203000_streamer_suite_schema.sql');

const sql = fs.readFileSync(sqlPath, 'utf8');
const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'app_rw',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'app_core',
  multipleStatements: true,
});
await conn.query(sql);
console.log('Applied:', path.basename(sqlPath));
await conn.end();
