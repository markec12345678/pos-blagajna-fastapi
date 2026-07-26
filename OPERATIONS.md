# OPERATIONS — URY Restaurant POS System

## Daily Operations

### Morning Startup
1. Start backend: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
2. Start frontend (dev): `cd frontend && npm run dev`
3. Start frontend (prod): serve `frontend/dist/` via nginx or Caddy
4. Verify health: `curl http://localhost:8000/api/v1/health`

### Evening Shutdown
1. Ensure all orders are closed/paid
2. Run end-of-day report via POS analytics
3. Backend can be stopped — SQLite persists data automatically
4. For PostgreSQL: `pg_dump` before stopping if needed

## Service Management

### Starting as Windows Service
```powershell
# Using NSSM
nssm install URY-POS "C:\Python314\python.exe" "-m uvicorn app.main:app --host 0.0.0.0 --port 8000"
nssm set URY-POS AppDirectory "F:\testcursor"
nssm start URY-POS
```

### Starting as Linux Service
```ini
# /etc/systemd/system/ury-pos.service
[Unit]
Description=URY Restaurant POS API
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/ury-pos
ExecStart=/opt/ury-pos/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ury-pos
sudo systemctl start ury-pos
sudo systemctl status ury-pos
```

## Database Operations

### SQLite (Default)
- Database file: `pos.db` in project root
- WAL mode enabled automatically
- Backup: copy file while app is running (WAL ensures consistency)
- No special setup required

### PostgreSQL (Production)
```bash
# Create database
createdb ury_pos

# Set environment variable
export DATABASE_URL="postgresql://user:pass@localhost:5432/ury_pos"

# Run migrations
alembic upgrade head

# Backup
pg_dump -U user ury_pos > backup_$(date +%Y%m%d).sql

# Restore
psql -U user ury_pos < backup_20260718.sql
```

### Running Migrations
```bash
# Create migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1

# Check current version
alembic current
```

## Monitoring

### Health Checks
```bash
# Basic health
curl http://localhost:8000/api/v1/health

# Expected response
{"status": "ok", "version": "1.0.0"}
```

### Log Monitoring
```bash
# Backend logs (uvicorn)
# Logs appear on stdout/stderr

# Check for errors
curl -s http://localhost:8000/api/v1/dashboard | python -m json.tool

# Monitor active orders
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/kds/orders
```

### Key Metrics to Watch
- **Response time**: < 200ms for POS operations
- **Memory usage**: < 512MB for backend
- **Disk usage**: SQLite WAL files should be small (< 50MB)
- **Active connections**: typically < 20 for single restaurant

## Print Setup

### ESC/POS Printer Configuration
1. Connect thermal printer (80mm or 58mm) via USB or network
2. Set printer IP in POS settings: `http://localhost:8000/api/v1/settings`
3. Configure `printer_ip` and `printer_port` in settings
4. Test print from KDS or POS

### Kitchen Printers
- Configure multiple printers per station (Grill, Pizza, Bar)
- Set `prep_stations` in settings: `"Grill,Pizza,Salad,Bar"`
- KDS automatically routes items to correct station

## Multi-Branch Setup

### Environment Variables
```bash
# Branch ID for this instance
export BRANCH_ID=1

# Database per branch
export DATABASE_URL="postgresql://user:pass@localhost:5432/ury_pos_branch1"
```

### Branch-Specific Settings
- Each branch has independent menu, staff, and settings
- Shared: customer database, loyalty points
- Reports can be aggregated across branches

## Cache Management

### In-Memory Cache
- Menu, tables, and settings are cached in browser
- Cache expires based on settings
- Force refresh: clear localStorage `pos-*` keys

### Redis Cache (Optional)
```bash
# Install Redis
# Set in config
export REDIS_URL="redis://localhost:6379"

# Cache TTL: 300 seconds for menu, 60 for tables
```

## Backup Schedule

| What | When | Retention |
|------|------|-----------|
| SQLite copy | Daily 02:00 | 30 days |
| PostgreSQL dump | Daily 02:00 | 90 days |
| Settings export | Weekly | indefinite |
| Menu export | After changes | indefinite |

## Common Tasks

### Add New Menu Item
1. Go to Menu Editor in POS
2. Add item with name, price, category
3. Set modifiers if needed
4. Assign allergens
5. Upload image (optional)

### Update Staff PIN
1. Go to Users page
2. Select employee
3. Set new PIN (3-8 digits)
4. PIN is SHA-256 salted hashed — never stored in plain text

### Generate Monthly Report
1. Go to Analytics → Reports
2. Select date range
3. Export as PDF or CSV
4. Reports include: revenue, items sold, staff performance

### FURS e-Račun (Slovenian Fiscalization)
1. Configure certificate in settings
2. Invoices auto-fiscalize on payment
3. Check status: Analytics → e-Račun
4. Bulk send failed invoices: Invoices → Bulk Send
