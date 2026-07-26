# AGENTS.md — URY Restaurant POS System

## Project Identity
- **Name:** URY Restaurant Management System / POS Blagajna
- **Business:** River Kolpa restaurant (Majda Pezdirc, Griblje 70, 8332 Gradac, Slovenija)
- **Language:** Slovenian UI, English code comments

## Tech Stack
- **Backend:** Python 3.14, FastAPI, SQLAlchemy (SQLite default, PostgreSQL optional), Alembic
- **Frontend:** React 19, TypeScript 5.7, Vite 6, single-page app (no React Router)
- **Auth:** bcrypt + JWT (random `secrets.token_urlsafe(48)` key), PIN validation (3-8 digits, SHA-256 salted)
- **Database:** `pos.db` (SQLite WAL mode), `restaurant.db` (secondary)

## Commands
```bash
# Backend
cd F:\testcursor
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd F:\testcursor\frontend
npm run dev          # Vite dev server on port 5173
npm run build        # TypeScript check + Vite build
npx tsc --noEmit     # Type-check only

# Tests
pytest               # From project root
```

## Architecture
```
app/
├── main.py              # FastAPI app, router registration (all in single import line)
├── core/                # Config, database, auth, ESC/POS, pricing, QR, PDF
├── models/              # SQLAlchemy ORM models (40 files)
├── schemas/             # Pydantic schemas (36 files)
├── api/v1/              # Route handlers (~200 files, versioned V2–V8)
├── services/            # AI, messaging, predictive, voice
└── repositories/        # (empty, not yet used)
frontend/
├── src/
│   ├── App.tsx          # Single SPA entry, page routing via state
│   ├── api.ts           # API client
│   ├── i18n.ts          # Slovenian/English translations
│   ├── POS.tsx          # Main POS screen
│   ├── KDS.tsx          # Kitchen display
│   ├── *Page.tsx        # Feature pages (200+ files)
│   └── hooks/           # Custom React hooks
└── package.json
```

## Code Conventions
- **All routers** imported at top of `main.py` as single long `from app.api.v1 import ...` line
- **Router registration:** `app.include_router(module.router, prefix=api_prefix)` — each on its own line
- **Backend routes:** `@router.get("/module-name/endpoint")` with `get_db` and `get_current_user` dependencies
- **Frontend pages:** Functional components, `React.lazy()` for all pages, `useState`/`useEffect`
- **No React Router** — single SPA with `window.location.pathname` matching for public routes
- **i18n:** `localStorage.getItem('lang') || 'sl'` pattern, SL/EN keys in `i18n.ts`
- **CSS:** Tailwind utility classes, inline styles for modals/overlays
- **State:** Local `useState` for each page, fetch on mount via `useEffect`
- **Auth flow:** Login → PIN dialog → JWT token → role-based sidebar visibility

## Role-Based Access
- `admin` / `manager`: Full access
- `waiter`: POS, waitlist, tables, floor-plan, reservations, customers, loyalty, KDS
- `chef`: KDS, menu-editor, inventory, waste, stocktaking, prep-list
- `cashier`: POS, customers, orders, payments, gift-cards, reports-basic
- `delivery`: POS, delivery, orders

## Sidebar Structure
- Pages organized in groups: Osnovno, Naročila, Prodaja, Blagajna, Zaloge, Kadri, Analitika, Napredno
- Each page has: key, icon, and is rendered via `pageGroups` array in App.tsx
- Navigation is filtered by user role via `roleAccess` map

## API Route Count
Current: ~1271 routes. Growing with each session (V2–V8 modules).

## Known Issues
- **18 pre-existing TypeScript errors** (not introduced by us):
  - `api.ts`: spread type mismatches (13 errors)
  - `BarcodeInventory.tsx`: missing types (4 errors)
  - `VoiceOrdering.tsx`: missing type (1 error)
- These do NOT block the build — `vite build` succeeds despite them

## Adding New Modules
1. Create `app/api/v1/module_vN.py` with router
2. Create `frontend/src/ModuleVnPage.tsx`
3. Add import to `main.py` import line (append to existing)
4. Add `app.include_router(module_vn.router, prefix=api_prefix)` in main.py
5. Add `React.lazy()` import in App.tsx
6. Add to `Page` type union in App.tsx
7. Add to both `validPages` arrays in App.tsx
8. Add to `pageGroups` array in App.tsx
9. Add rendering `{page === 'module-vn' && <ModuleVnPage onNotify={notify} />}`
10. Add SL/EN nav translations in i18n.ts

## Database
- SQLAlchemy with `declarative_base()`
- Auto-create tables via `Base.metadata.create_all(bind=engine)`
- Alembic for migrations (`alembic/` directory)
- Seed data creates admin (admin/admin, PIN 1111) and cashier (cashier/cashier, PIN 2222)
