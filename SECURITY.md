# Security — URY Restaurant POS

## Authentication
- **Password hashing**: bcrypt with per-user salt
- **PIN hashing**: SHA-256 with per-user random salt (3-8 digits)
- **JWT**: HS256 with random `secrets.token_urlsafe(48)` secret per server start
- **JWT claims**: `sub`, `role`, `exp` (24h expiry)
- **Token storage**: localStorage (client-side)

## Transport
- HTTPS required in production
- WebSocket uses same protocol as page
- CORS configured for production domain

## API Security
- Role-based access control (RBAC) on all endpoints
- Input validation via Pydantic schemas
- SQL injection prevented by SQLAlchemy ORM
- No raw SQL queries anywhere in codebase

## Data Protection
- No secrets or API keys in source code
- `JWT_SECRET` generated fresh each startup (not persistent)
- Database credentials via environment variables
- PIN codes are one-way hashed (bcrypt/SHA-256)

## Known Limitations
- localStorage for tokens (XSS vulnerable if JS injected)
- SQLite not suitable for high-concurrency production
- No rate limiting on auth endpoints
- No CSRF protection (SPA architecture)

## Security Audit Results (2026-07-18)
- **Bandit**: 0 issues (HIGH/MEDIUM/LOW)
- **npm audit**: 0 vulnerabilities
- **Hardcoded secrets**: None found
- **SQL injection**: None (ORM only)

## Recommendations
1. Add rate limiting on `/auth/login` and `/auth/pin`
2. Implement refresh tokens (short-lived access + long-lived refresh)
3. Switch to PostgreSQL for production
4. Add HTTPS enforcement
5. Implement CSP headers
6. Add input sanitization for XSS prevention
