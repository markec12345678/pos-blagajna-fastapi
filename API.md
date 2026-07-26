# API Reference — URY Restaurant POS

Base URL: `http://localhost:8000/api/v1`

## Authentication
```
POST /auth/login     { username, password } → { access_token, user }
POST /auth/pin       { pin } → { access_token, user }
GET  /auth/me        → { id, username, full_name, role }
```

## Menu
```
GET    /menu/categories          → [{ id, name }]
POST   /menu/categories          { name } → { id, name }
GET    /menu/items               → { items: [...], total }
POST   /menu/items               { name, price, category_id } → MenuItemOut
PUT    /menu/items/{id}          { price? } → MenuItemOut
DELETE /menu/items/{id}
```

## Orders
```
POST /orders                { table_id, items: [{ menu_item_id, quantity }] } → Order
GET  /orders                → [Order]
GET  /orders/{id}           → Order
POST /orders/{id}/close
POST /orders/{id}/hold
POST /orders/{id}/cancel
POST /orders/{id}/refund
```

## Tables
```
GET  /tables                → [Table]
POST /tables                { name, capacity } → Table
PUT  /tables/{id}           → Table
DELETE /tables/{id}
```

## Customers
```
GET    /customers            → [Customer]
POST   /customers            { name, email?, phone? } → Customer
GET    /customers/{id}       → Customer
```

## Reservations
```
GET  /reservations           → [Reservation]
POST /reservations           { customer_name, reservation_time, guests } → { id, status }
PUT  /reservations/{id}
DELETE /reservations/{id}
```

## Payments
```
POST /payments               { order_id, method, amount }
GET  /payments               → [Payment]
```

## Analytics
```
GET  /analytics/sales/daily
GET  /analytics/sales/hourly
GET  /analytics/top-items
GET  /analytics/summary
```

## WebSocket
```
ws://localhost:8000/ws/{table_id}
Events: order_created, order_closed, item_status, new_order
```

## Public (No Auth)
```
GET /public/menu/{table_id}
POST /public/orders
GET /public/reservations/slots
```

## Error Responses
```json
{ "detail": "Error message" }
```
Status codes: 400 (bad request), 401 (unauthorized), 404 (not found), 409 (conflict), 422 (validation)
