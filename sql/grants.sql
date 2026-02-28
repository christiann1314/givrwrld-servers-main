-- MySQL Users and Grants for GIVRwrld
-- Run: mysql -u root < sql/grants.sql
-- ⚠️ REPLACE ALL 'REPLACE_ME_*' PASSWORDS WITH STRONG RANDOM PASSWORDS

-- ============ Create Databases ============

CREATE DATABASE IF NOT EXISTS app_core CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============ Application User (Read/Write on app_core) ============

CREATE USER IF NOT EXISTS 'app_rw'@'localhost' IDENTIFIED BY 'Y3bD4KZDnxoeh43voH9ZCRESg0LjSugD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON app_core.* TO 'app_rw'@'localhost';
GRANT CREATE TEMPORARY TABLES ON app_core.* TO 'app_rw'@'localhost';

-- ============ Panel User (Read/Write on panel) ============

CREATE USER IF NOT EXISTS 'panel_rw'@'localhost' IDENTIFIED BY 'tl2V6izXHpv3RalxDaaUxlRvHm3q5nwj';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON panel.* TO 'panel_rw'@'localhost';
GRANT CREATE TEMPORARY TABLES ON panel.* TO 'panel_rw'@'localhost';

-- ============ Provisioning User (Can create/drop customer DBs) ============

CREATE USER IF NOT EXISTS 'provisioning_rw'@'localhost' IDENTIFIED BY 'AK6pK8x6Dp7yTa5i0hoaCmi8v412fq1A';
GRANT CREATE, DROP, CREATE USER, ALTER, SHOW DATABASES, GRANT OPTION ON *.* TO 'provisioning_rw'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON app_core.* TO 'provisioning_rw'@'localhost';

-- ============ Backup User (Read-only for dumps) ============

CREATE USER IF NOT EXISTS 'backup_ro'@'localhost' IDENTIFIED BY 'cWdKRLWAG7yvJhVgXhwfli2dbEIJ5YZa';
GRANT RELOAD, PROCESS, LOCK TABLES, REPLICATION CLIENT, SELECT ON *.* TO 'backup_ro'@'localhost';
GRANT SHOW VIEW ON *.* TO 'backup_ro'@'localhost';

-- ============ Flush Privileges ============

FLUSH PRIVILEGES;

-- ============ Verification ============

-- Run these to verify:
-- SHOW GRANTS FOR 'app_rw'@'localhost';
-- SHOW GRANTS FOR 'panel_rw'@'localhost';
-- SHOW GRANTS FOR 'provisioning_rw'@'localhost';
-- SHOW GRANTS FOR 'backup_ro'@'localhost';



