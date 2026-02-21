// MySQL Database Configuration
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'app_rw',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'app_core',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection (non-fatal so server can start; DB routes will fail until MySQL is up)
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL connection pool created');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message || err);
    console.warn('⚠️ Start MariaDB/Docker (e.g. Docker Desktop) and restart the API to connect.');
  });

export default pool;


