-- Ensure app_rw can connect from any host (e.g. 172.30.0.1 from WSL2/Docker Desktop).
-- Fixes: "Access denied for user 'app_rw'@'172.30.0.1'"
-- Runs first in docker-entrypoint-initdb.d (before 01-app_core.sql).

CREATE USER IF NOT EXISTS 'app_rw'@'%' IDENTIFIED BY 'devpass';
GRANT ALL PRIVILEGES ON app_core.* TO 'app_rw'@'%';
FLUSH PRIVILEGES;
