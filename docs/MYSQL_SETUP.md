# Local MySQL Setup

The GIVRwrld API uses **local MySQL** for the database. The connection is configured in `api/config/database.js` and uses these environment variables (set in `api/.env`):

## Required Environment Variables

```env
# MySQL - Local database (defaults work for localhost)
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=app_rw
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=app_core
```

## Local Setup Steps

1. **Install MySQL 8.0** (or compatible) on your machine.
2. **Create the database and user:**
   ```sql
   CREATE DATABASE app_core;
   CREATE USER 'app_rw'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON app_core.* TO 'app_rw'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. **Run the schema:** `mysql -u app_rw -p app_core < sql/app_core.sql`
4. **Copy `api/.env.api.example` to `api/.env`** and fill in your values.

The API will connect to `127.0.0.1:3306` by default and use the `app_core` database.
