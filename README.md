# POS Blagajna - Restaurant Management System

Production-ready restaurant management system with FastAPI backend and React frontend.

## Features

- **Menu Management**: Categories, items, prices, allergens, images
- **Table Management**: Floor plan, QR codes, status tracking
- **Order Processing**: Dine-in, takeaway, delivery, KDS integration
- **Payment Processing**: Cash, card, terminal, split bills, refunds
- **Inventory Management**: Stock tracking, low stock alerts, auto-reorder
- **Customer Management**: Profiles, loyalty points, feedback
- **Analytics**: Sales reports, predictive analytics, waste tracking
- **AI Features**: Menu search, combo suggestions, voice ordering
- **Multi-branch Support**: Branch management, inter-branch transfers

## Requirements

- Python 3.9+
- Node.js 18+
- SQLite (default) or PostgreSQL

## Installation

```bash
pip install -r requirements.txt
cd frontend && pnpm install
```

## Running

### Backend
```bash
python -m app.main
# or: uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend && pnpm dev
```

## API Endpoints

- `/api/v1/auth` - Authentication
- `/api/v1/menu` - Menu management
- `/api/v1/orders` - Order processing
- `/api/v1/payments` - Payment processing
- `/api/v1/inventory` - Stock management
- `/api/v1/customers` - Customer management
- `/api/v1/analytics` - Analytics and reports

## Architecture

- **Backend**: FastAPI + SQLAlchemy + SQLite/PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Real-time**: WebSocket for KDS and notifications
- **AI**: Puter.com z-ai/glm-5 integration

## License

MIT License