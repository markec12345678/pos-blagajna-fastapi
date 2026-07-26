# Changelog — URY Restaurant POS

## v1.0.0 (2026-07-18) — Production Ready

### Core Features
- Full POS system with 1271+ API routes
- 182 frontend pages (React SPA)
- Role-based access: admin, manager, waiter, chef, cashier, delivery
- Real-time kitchen display system (KDS) via WebSocket
- Thermal printer integration (ESC/POS)
- Slovenian/English i18n

### Modules
- **POS**: Table management, orders, payments (cash/card/gift card)
- **KDS**: Order queue, timers, sound alerts, priority
- **Menu**: Categories, items, translations, allergens, dietary filters
- **Inventory**: Stock tracking, batch operations, expiry alerts
- **Reservations**: Date/time, guest count, status management
- **Schedule**: Shift planning, swap requests, templates
- **Analytics**: Sales, popular items, peak hours, revenue
- **Loyalty**: Points, tiers (Bronze/Silver/Gold/Platinum)
- **AI**: Smart suggestions, voice ordering, chat
- **Marketing**: Promotions, discounts, gift cards
- **Finance**: Expense tracking, P&L, cash register
- **CRM**: Customer profiles, history, preferences
- **Quality**: Supplier management, quality control
- **Logistics**: Delivery tracking, route optimization
- **Reports**: Advanced analytics, Excel export, scheduling

### Security
- bcrypt password hashing
- JWT with random secret
- SHA-256 PIN hashing
- Bandit: 0 issues
- npm audit: 0 vulnerabilities

### Testing
- 34 backend tests (pytest)
- 31 frontend tests (vitest)
- 8 E2E tests (Playwright)
- 42% backend coverage, 13% frontend coverage

### CI/CD
- GitHub Actions pipeline: tsc → build → tests
- Local CI script: `ci-check.bat`
