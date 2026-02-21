#!/usr/bin/env bash
set -euo pipefail

# MySQL Backup Script
# Run daily via systemd timer
# Place in: /opt/backup/mysql/backup.sh

DATE=$(date +%F_%H%M)
DEST=/opt/backup/mysql
LOG_DIR=/var/log/mysql-backups
LOG="$LOG_DIR/$DATE.log"

# Create directories
mkdir -p "$DEST" "$LOG_DIR"

# Load backup password from environment or config
# Set MYSQL_PWD in systemd service or use .my.cnf
MYSQL_USER="${MYSQL_BACKUP_USER:-backup_ro}"
MYSQL_PWD="${MYSQL_BACKUP_PASSWORD:-}"

# Function to dump database
dump_db() {
  local db_name=$1
  local output_file="$DEST/${db_name}_${DATE}.sql"
  
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Dumping $db_name..." | tee -a "$LOG"
  
  if [ -n "$MYSQL_PWD" ]; then
    MYSQL_PWD="$MYSQL_PWD" mysqldump -u"$MYSQL_USER" \
      --single-transaction \
      --routines \
      --triggers \
      --events \
      --hex-blob \
      "$db_name" > "$output_file" 2>>"$LOG"
  else
    mysqldump -u"$MYSQL_USER" \
      --single-transaction \
      --routines \
      --triggers \
      --events \
      --hex-blob \
      "$db_name" > "$output_file" 2>>"$LOG"
  fi
  
  if [ $? -eq 0 ]; then
    local size=$(du -h "$output_file" | cut -f1)
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $db_name dumped ($size)" | tee -a "$LOG"
    # Compress
    gzip "$output_file"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $db_name compressed" | tee -a "$LOG"
  else
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ Failed to dump $db_name" | tee -a "$LOG"
    return 1
  fi
}

# Start backup
echo "========================================" | tee -a "$LOG"
echo "MySQL Backup Started: $(date)" | tee -a "$LOG"
echo "========================================" | tee -a "$LOG"

# Backup core databases
dump_db "app_core"
dump_db "panel"

# Backup customer databases
CUSTOMER_DBS=$(mysql -u"$MYSQL_USER" -N -e "SHOW DATABASES LIKE 'customer\_%';" 2>/dev/null || true)
if [ -n "$CUSTOMER_DBS" ]; then
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Found customer databases" | tee -a "$LOG"
  while IFS= read -r db; do
    [ -n "$db" ] && dump_db "$db"
  done <<< "$CUSTOMER_DBS"
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] No customer databases found" | tee -a "$LOG"
fi

# Cleanup old backups (keep 14 days)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Cleaning up old backups (14+ days)..." | tee -a "$LOG"
find "$DEST" -type f -name "*.sql.gz" -mtime +14 -delete
DELETED=$(find "$DEST" -type f -name "*.sql.gz" -mtime +14 | wc -l)
[ "$DELETED" -gt 0 ] && echo "[$(date +'%Y-%m-%d %H:%M:%S')] Deleted $DELETED old backup(s)" | tee -a "$LOG"

# Summary
TOTAL_SIZE=$(du -sh "$DEST" | cut -f1)
echo "========================================" | tee -a "$LOG"
echo "Backup Complete: $(date)" | tee -a "$LOG"
echo "Total backup size: $TOTAL_SIZE" | tee -a "$LOG"
echo "========================================" | tee -a "$LOG"



