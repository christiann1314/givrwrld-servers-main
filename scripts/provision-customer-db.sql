-- Provision Customer Database and User
-- Usage: mysql -u provisioning_rw -p app_core < scripts/provision-customer-db.sql
-- Or use in application code with prepared statements

-- Variables (set these in your application code)
-- SET @db_name = 'customer_srvr_5f2d';
-- SET @db_user = 'cust_5f2d';
-- SET @db_pass = 'LONG_RANDOM_PASSWORD_HERE';

-- Create database
SET @sql := CONCAT('CREATE DATABASE IF NOT EXISTS ', @db_name, ' CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create user
SET @sql := CONCAT("CREATE USER IF NOT EXISTS '", @db_user, "'@'localhost' IDENTIFIED BY '", @db_pass, "';");
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Grant privileges on customer database only
SET @sql := CONCAT('GRANT ALL PRIVILEGES ON ', @db_name, '.* TO ''', @db_user, '''@''localhost'';');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify (optional)
-- SELECT 'Database created' AS status;
-- SHOW DATABASES LIKE @db_name;
-- SELECT User, Host FROM mysql.user WHERE User = @db_user;



