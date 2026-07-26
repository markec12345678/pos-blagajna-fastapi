# Architecture — URY Restaurant POS

## Overview
Full-stack restaurant management system: FastAPI backend + React SPA frontend + URY/Frappe ERPNext integration.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Python 3.14, FastAPI, SQLAlchemy, Alembic |
| Frontend | React 19, TypeScript 5.7, Vite 6, Tailwind |
| Database | SQLite (WAL) default, PostgreSQL optional |
| Auth | bcrypt + JWT (random secret), PIN (SHA-256) |
| Realtime | WebSocket (FastAPI) |
| E2E | Playwright (Chromium) |
| Fiscal | FURS EOR/ZOI (Slovenian tax authority) |
| Printing | ESC/POS thermal printer |

## Directory Structure
```
F:\testcursor/
├── app/
│   ├── main.py              # FastAPI app, 1271+ route registration
│   ├── core/                # Config, DB, auth, ESC/POS, pricing, QR, PDF
│   ├── models/              # SQLAlchemy ORM (40+ files)
│   ├── schemas/             # Pydantic schemas (36 files)
│   ├── api/v1/              # Route handlers (~200 files, versioned V2–V8)
│   ├── services/            # AI, messaging, predictive, voice
│   └── repositories/        # (reserved for future use)
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # SPA entry, page routing via state
│   │   ├── api.ts           # API client (70+ functions)
│   │   ├── i18n.ts          # Slovenian/English translations (891 lines)
│   │   ├── POS.tsx          # Main POS screen (1301 lines)
│   │   ├── KDS.tsx          # Kitchen Display System
│   │   ├── *Page.tsx        # Feature pages (182 pages)
│   │   └── __tests__/       # Vitest tests (5 files, 31 tests)
│   └── vite.config.ts       # Vite + Vitest config
├── tests/
│   ├── conftest.py          # Pytest fixtures (TestClient, auth)
│   ├── test_api.py          # Unit tests (20 tests)
│   └── test_integration.py  # Integration tests (14 tests)
├── e2e/
│   └── pos.spec.ts          # Playwright E2E tests (8 tests)
├── .github/workflows/ci.yml # GitHub Actions CI
└── ci-check.bat             # Local CI script
```

## Data Flow
```
Browser → React SPA → api.ts → FastAPI → SQLAlchemy → SQLite/PostgreSQL
                                    ↕
                              WebSocket (realtime)
                                    ↕
                              ESC/POS printer
```

## Auth Flow
1. Login (username/password) → JWT token (exp claim + random secret)
2. PIN login (3-8 digits) → JWT token
3. Frontend stores token in localStorage
4. All API calls include `Authorization: Bearer <token>`
5. Role-based access: admin, manager, waiter, chef, cashier, delivery

## Role Access Matrix
| Page | admin | manager | waiter | chef | cashier | delivery |
|------|-------|---------|--------|------|---------|----------|
| POS | ✓ | ✓ | ✓ | | ✓ | ✓ |
| KDS | ✓ | ✓ | | ✓ | | |
| Dashboard | ✓ | ✓ | | | | |
| Inventory | ✓ | ✓ | | ✓ | | |
| Reports | ✓ | ✓ | | | ✓ | |
| Schedule | ✓ | ✓ | ✓ | ✓ | | |

## API Versioning
- Base: `/api/v1/`
- Modules versioned: `module.py`, `module_v2.py`, ..., `module_v8.py`
- Each version adds new endpoints while preserving old ones
- Current: 1271+ registered routes

## Frontend Architecture
- Single SPA (no React Router)
- Page routing via `useState` + `window.location.pathname`
- All pages use `React.lazy()` for code splitting
- i18n: `localStorage.getItem('lang')` for SL/EN
- State: local `useState` per page, fetch on mount via `useEffect`
- Offline: IndexedDB cache + queue for offline support
