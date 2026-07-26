# DISASTER RECOVERY — URY Restaurant POS System

## Recovery Objectives

| Metric | Target | Notes |
|--------|--------|-------|
| **RPO** (Recovery Point Objective) | < 24 hours | Daily backups at 02:00 |
| **RTO** (Recovery Time Objective) | < 1 hour | Fresh install + restore |
| **RPO** (with PostgreSQL replication) | < 5 minutes | Streaming replication |

## Backup Strategy

### What to Back Up
| Component | Location | Method | Frequency |
|-----------|----------|--------|-----------|
| SQLite database | `pos.db` | File copy | Daily |
| PostgreSQL database | `ury_pos` | `pg_dump` | Daily |
| Application code | `F:\testcursor` | Git push | On commit |
| Settings/config | API endpoint | JSON export | Weekly |
| Menu data | API endpoint | JSON export | After changes |
| FURS certificate | Settings dir | File copy | Monthly |
| Frontend build | `frontend/dist` | File copy | After build |

### Automated Backup Script

#### Windows (`backup.bat`)
```batch
@echo off
set BACKUP_DIR=F:\backups\ury-pos
set DATE=%date:~-4%%date:~4,2%%date:~7,2%

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

REM SQLite backup (safe to copy while running - WAL mode)
copy F:\testcursor\pos.db %BACKUP_DIR\pos_%DATE%.db
copy F:\testcursor\pos.db-wal %BACKUP_DIR\pos_%DATE%.db-wal 2>nul
copy F:\testcursor\pos.db-shm %BACKUP_DIR\pos_%DATE%.db-shm 2>nul

REM Cleanup backups older than 30 days
forfiles /p %BACKUP_DIR% /m pos_*.db /d -30 /c "cmd /c del @path" 2>nul

echo Backup completed: %BACKUP_DIR%\pos_%DATE%.db
```

#### Linux (`/opt/ury-pos/backup.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/ury-pos"
DATE=$(date +%Y%m%d)
DB_PATH="/opt/ury-pos/pos.db"

mkdir -p $BACKUP_DIR

# SQLite safe backup
cp $DB_PATH $BACKUP_DIR/pos_$DATE.db
cp ${DB_PATH}-wal $BACKUP_DIR/pos_$DATE.db-wal 2>/dev/null
cp ${DB_PATH}-shm $BACKUP_DIR/pos_$DATE.db-shm 2>/dev/null

# PostgreSQL backup (if applicable)
if [ -n "$DATABASE_URL" ]; then
    pg_dump ury_pos > $BACKUP_DIR/ury_pos_$DATE.sql
    gzip $BACKUP_DIR/ury_pos_$DATE.sql
fi

# Cleanup older than 30 days
find $BACKUP_DIR -name "pos_*.db" -mtime +30 -delete
find $BACKUP_DIR -name "ury_pos_*.sql.gz" -mtime +90 -delete

echo "Backup completed: $BACKUP_DIR"
```

### Scheduled Backups

#### Windows Task Scheduler
```powershell
# Create daily backup task at 02:00
schtasks /create /tn "URY-POS-Backup" /tr "F:\testcursor\backup.bat" /sc daily /st 02:00
```

#### Linux Cron
```bash
# Add to crontab
0 2 * * * /opt/ury-pos/backup.sh >> /var/log/ury-backup.log 2>&1
```

## Recovery Procedures

### Scenario 1: Database Corruption (SQLite)

**Time estimate: 15 minutes**

```bash
# 1. Stop the backend
taskkill /F /IM python.exe   # Windows
killall uvicorn              # Linux

# 2. Check for corruption
sqlite3 pos.db "PRAGMA integrity_check;"

# 3. If corrupted, try .recover
sqlite3 pos.db ".recover" > recovered.sql
sqlite3 pos.db.new < recovered.sql

# 4. Replace database
mv pos.db pos.db.corrupted
mv pos.db.new pos.db

# 5. Restart backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 6. If .recover fails, restore from backup
cp F:\backups\ury-pos\pos_20260718.db pos.db
# Note: data since backup will be lost
```

### Scenario 2: Full System Failure (New Machine)

**Time estimate: 45 minutes**

```bash
# 1. Install prerequisites
# Windows: Python 3.14, Node.js 22
# Linux: python3.14, nodejs 22

# 2. Clone repository
git clone <repo-url> F:\testcursor

# 3. Install Python dependencies
cd F:\testcursor
pip install -r requirements.txt

# 4. Install frontend dependencies
cd frontend
npm ci
npm run build

# 5. Restore database from backup
copy F:\backups\ury-pos\pos_YYYYMMDD.db F:\testcursor\pos.db

# 6. Start services
cd F:\testcursor
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 7. Verify
curl http://localhost:8000/api/v1/health
```

### Scenario 3: PostgreSQL Failure

**Time estimate: 30 minutes**

```bash
# 1. Stop backend
sudo systemctl stop ury-pos

# 2. Check PostgreSQL status
sudo systemctl status postgresql

# 3. If service is down, restart
sudo systemctl start postgresql

# 4. If data is corrupted, restore
sudo -u postgres dropdb ury_pos
sudo -u postgres createdb ury_pos
psql -U user ury_pos < /var/backups/ury-pos/ury_pos_YYYYMMDD.sql

# 5. Restart backend
sudo systemctl start ury-pos
```

### Scenario 4: FURS Certificate Expiry

**Time estimate: 2 hours (depends on CA)**

1. Generate new CSR (Certificate Signing Request)
2. Submit to Slovenian CA (SIGEN-CA or POŠTA)
3. Download new certificate
4. Install in POS settings
5. Test with FURS test endpoint
6. Bulk-retry any pending invoices

## Verification Checklist

After recovery, verify:

- [ ] Backend health check returns OK
- [ ] Login works (admin/admin)
- [ ] Menu loads correctly
- [ ] Can create and pay an order
- [ ] KDS receives orders
- [ ] Printer responds (if connected)
- [ ] e-Račun connection works (if configured)
- [ ] Reports show correct data
- [ ] Customer data is intact
- [ ] Loyalty points are correct

## Data Integrity Checks

```bash
# SQLite integrity check
sqlite3 pos.db "PRAGMA integrity_check;"

# Count orders (should match last known count)
sqlite3 pos.db "SELECT count(*) FROM orders;"

# Check for orphaned records
sqlite3 pos.db "
SELECT 'order_items without order' as issue, count(*) as cnt
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL
UNION ALL
SELECT 'payments without order', count(*)
FROM payments p
LEFT JOIN orders o ON p.order_id = o.id
WHERE o.id IS NULL;
"

# PostgreSQL equivalent
psql -U user ury_pos -c "
SELECT 'order_items without order' as issue, count(*) as cnt
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL;
"
```

## Contact Escalation

| Priority | Contact | When |
|----------|---------|------|
| P1 System down | IT Admin (phone) | Immediately |
| P2 Major feature | IT Admin (message) | < 15 min |
| P3 Minor issue | IT Admin (email) | < 1 hour |
| P4 Cosmetic | Development team | Next business day |
