# Deployment Guide — URY Restaurant POS

## Prerequisites
- Python 3.14+
- Node.js 22+
- SQLite (default) or PostgreSQL

## Quick Start

### Backend
```bash
cd F:\testcursor
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd F:\testcursor\frontend
npm install
npm run dev        # Development (port 5173)
npm run build      # Production build
npm run preview    # Preview production build
```

## Production Build
```bash
# Build frontend
cd frontend && npm run build

# Backend runs with the built frontend served from /dist
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./pos.db` | Database connection |
| `JWT_SECRET` | Random per startup | JWT signing key |
| `PUTER_TOKEN` | Required | AI service token |

## Database
- Auto-creates tables on first run
- Seed data: admin (admin/admin, PIN 1111), cashier (cashier/cashier, PIN 2222)
- Migrations: `alembic upgrade head`

## CI/CD
```bash
# Local quality gate
ci-check.bat

# Or manual:
tsc -b --noEmit          # TypeScript check
npm run build            # Build
pytest tests/            # Backend tests
npx vitest run           # Frontend tests
npx playwright test      # E2E tests
```

## Monitoring
- Health: `GET /api/v1/system/health`
- Dashboard: `GET /api/v1/dashboard`
- Realtime: WebSocket for order updates
