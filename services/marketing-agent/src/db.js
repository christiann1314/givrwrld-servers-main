import mysql from 'mysql2/promise';

// Simple MariaDB pool for the marketing agent.
// Reuses the same credentials as the main API (MYSQL_* envs).

const {
  MYSQL_HOST = '127.0.0.1',
  MYSQL_PORT = '3306',
  MYSQL_USER = 'app_rw',
  MYSQL_PASSWORD = 'devpass',
  MYSQL_DATABASE = 'app_core',
} = process.env;

export const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: Number(MYSQL_PORT),
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

