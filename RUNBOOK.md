# RUNBOOK — Incident Response & Troubleshooting

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1** | System down, no orders possible | Immediate | Backend crash, database corruption |
| **P2** | Major feature broken | < 15 min | KDS not showing orders, payments failing |
| **P3** | Minor feature degraded | < 1 hour | Slow reports, printer issues |
| **P4** | Cosmetic / low impact | Next day | UI glitches, typo in translations |

## P1: Backend Down

### Symptoms
- POS shows "Napaka pri povezavi" (Connection error)
- `curl http://localhost:8000/api/v1/health` fails
- No new orders can be created

### Diagnosis
```bash
# Check if process is running
tasklist | findstr python        # Windows
ps aux | grep uvicorn            # Linux

# Check port
netstat -ano | findstr :8000     # Windows
ss -tlnp | grep 8000             # Linux

# Check logs
# If running as service:
journalctl -u ury-pos -n 100     # Linux
nssm status URY-POS              # Windows
```

### Resolution
```bash
# 1. Kill stuck process
taskkill /F /IM python.exe        # Windows
kill -9 $(pgrep uvicorn)          # Linux

# 2. Restart
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 3. If database locked (SQLite)
# Wait 5 seconds, then restart — WAL mode auto-recovers

# 4. If database corrupted
cp pos.db pos.db.backup
rm pos.db pos.db-wal pos.db-shm
# Database will recreate on next startup (data lost from last backup)
```

### Prevention
- Use PostgreSQL for production (> 1 concurrent user)
- Run backend as service with auto-restart
- Monitor with health check endpoint

## P2: KDS Not Showing Orders

### Symptoms
- Kitchen display shows "Nalaganje..." forever
- Or shows stale data, no new orders appear

### Diagnosis
```bash
# Check WebSocket
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/kds/orders

# Check browser console for WS errors
# F12 → Console → look for WebSocket errors
```

### Resolution
1. **Refresh KDS browser tab** (F5)
2. **Check network**: Ensure backend is reachable from KDS device
3. **Clear browser cache**: Ctrl+Shift+Delete → Clear all
4. **Check settings**: KDS refresh interval (Settings → KDS → Nastavitve osveževanja)
5. **Restart backend** if WebSocket is stuck

## P2: Payments Failing

### Symptoms
- "Napaka pri plačilu" error on payment
- Payment appears to go through but order not marked paid

### Diagnosis
```bash
# Check recent payments
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/reports/summary

# Check for FURS connection issues (if e-Račun enabled)
# Look for certificate errors in logs
```

### Resolution
1. **Retry payment** — most common: network hiccup
2. **Check FURS certificate**: Settings → e-Račun → Test connection
3. **Check offline queue**: Payments made offline are queued — check browser IndexedDB
4. **Manual payment**: If all else fails, record payment in backup system

## P3: Printer Not Working

### Symptoms
- Orders don't print to kitchen
- Receipt printer jams or outputs garbage

### Diagnosis
```bash
# Test printer connection
ping <printer_ip>

# Test print via ESC/POS
# Send raw ESC/POS commands to printer port (usually 9100)
```

### Resolution
1. **Check physical connection**: USB cable or network
2. **Check IP in settings**: Must match printer's actual IP
3. **Power cycle printer**: Turn off, wait 10s, turn on
4. **Check paper**: Ensure paper is loaded and not jammed
5. **Reset printer**: Hold feed button while turning on (most ESC/POS printers)

### Fallback
- KDS continues to work without printing
- Staff can view orders on screen
- Reprint from KDS if needed

## P3: Slow Performance

### Symptoms
- POS takes > 2 seconds to load menu
- Reports take > 10 seconds

### Diagnosis
```bash
# Check database size
ls -lh pos.db                    # Linux
dir pos.db                       # Windows

# Check active connections
# For PostgreSQL:
SELECT count(*) FROM pg_stat_activity;

# Check WAL size (SQLite)
ls -lh pos.db-wal
```

### Resolution
1. **SQLite WAL checkpoint**: Restart backend (auto-checkpoints on clean shutdown)
2. **PostgreSQL vacuum**: `VACUUM ANALYZE;`
3. **Clear browser cache**: Large localStorage can slow React
4. **Reduce menu size**: Archive unused items
5. **Check for N+1 queries**: Enable SQLAlchemy logging

## P3: FURS e-Račun Failures

### Symptoms
- Invoices show "Čaka" (pending) status
- "FURS napaka" messages in POS

### Diagnosis
```bash
# Check FURS connectivity
curl https://blagajna.furs.gov.si/ 

# Check certificate expiry
openssl x509 -enddate -noout -in certificate.pem
```

### Resolution
1. **Check internet**: FURS requires stable connection
2. **Check certificate**: Must be valid and not expired
3. **Retry**: Use bulk send in Invoices page
4. **Manual ZOI**: For extreme cases, generate ZOI manually

## Database Recovery

### SQLite: Database Locked
```bash
# Find process locking the file
# Windows: Handle.exe or Process Explorer
# Linux: lsof pos.db

# Kill the locking process, then restart backend
```

### SQLite: Corruption
```bash
# Attempt repair
sqlite3 pos.db ".recover" > recovered.sql
sqlite3 pos_new.db < recovered.sql
mv pos.db pos.db.corrupted
mv pos_new.db pos.db
```

### PostgreSQL: Connection Pool Exhausted
```sql
-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND query_start < now() - interval '10 minutes';

-- Reset pool
-- Restart backend service
```

## Offline Mode

### When Backend is Unreachable
- POS automatically queues requests in IndexedDB
- Staff can continue taking orders
- Payments are queued (cash recorded locally)
- On reconnect: queue syncs automatically

### Manual Queue Sync
1. Open browser DevTools (F12)
2. Go to Application → IndexedDB → pos-offline-queue
3. Review queued requests
4. Backend must be running to sync

### Checking Queue Status
```bash
# Via API (when backend is up)
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/health
```

## Escalation Contacts

| Issue | Contact |
|-------|---------|
| Infrastructure | IT Admin |
| FURS/Certificate | Accountant |
| Hardware (printers) | Equipment vendor |
| Software bugs | Development team |

## Post-Incident

After any P1 or P2 incident:
1. Document what happened and when
2. Identify root cause
3. Add monitoring to prevent recurrence
4. Update this runbook if new scenario discovered
5. Brief team on changes
