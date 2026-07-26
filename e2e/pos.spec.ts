import { test, expect } from '@playwright/test'

let sharedToken = ''

test.describe('POS E2E', () => {
  test.beforeAll(async ({ request }) => {
    if (!sharedToken) {
      const res = await request.post('/api/v1/auth/login', {
        data: { username: 'admin', password: 'admin' },
      })
      if (res.ok()) {
        const data = await res.json()
        sharedToken = data.access_token
      }
    }
  })

  const auth = () => ({ Authorization: `Bearer ${sharedToken}` })

  test('1. Health check', async ({ request }) => {
    const r = await request.get('/api/v1/system/health')
    expect(r.ok()).toBeTruthy()
    const d = await r.json()
    expect(d.server).toBeTruthy()
  })

  test('2. Login returns JWT', async ({ request }) => {
    const r = await request.post('/api/v1/auth/login', {
      data: { username: 'admin', password: 'admin' },
    })
    expect(r.ok()).toBeTruthy()
    const d = await r.json()
    expect(d.access_token).toBeTruthy()
    expect(d.user.username).toBe('admin')
  })

  test('3. Invalid credentials rejected', async ({ request }) => {
    const r = await request.post('/api/v1/auth/login', {
      data: { username: 'admin', password: 'wrong' },
    })
    expect(r.status()).toBe(401)
  })

  test('4. Menu items API', async ({ request }) => {
    const r = await request.get('/api/v1/menu/items', { headers: auth() })
    expect(r.ok()).toBeTruthy()
    const d = await r.json()
    expect(d.items).toBeDefined()
  })

  test('5. Tables API', async ({ request }) => {
    const r = await request.get('/api/v1/tables', { headers: auth() })
    expect(r.ok()).toBeTruthy()
  })

  test('6. Create and close order', async ({ request }) => {
    const cat = await request.post('/api/v1/menu/categories', {
      headers: auth(), data: { name: 'E2E Cat' },
    }).then(r => r.json())

    const item = await request.post('/api/v1/menu/items', {
      headers: auth(), data: { name: 'E2E Item', price: 5.0, category_id: cat.id },
    }).then(r => r.json())

    const table = await request.post('/api/v1/tables', {
      headers: auth(), data: { name: `T-${Date.now()}`, capacity: 2 },
    }).then(r => r.json())

    const order = await request.post('/api/v1/orders', {
      headers: auth(), data: {
        table_id: table.id,
        items: [{ menu_item_id: item.id, quantity: 1 }],
      },
    })
    expect(order.ok()).toBeTruthy()
    const o = await order.json()
    expect(o.id).toBeTruthy()

    const closed = await request.post(`/api/v1/orders/${o.id}/close`, { headers: auth() })
    expect(closed.ok()).toBeTruthy()
  })

  test('7. Create reservation', async ({ request }) => {
    const r = await request.post('/api/v1/reservations', {
      headers: auth(), data: {
        customer_name: 'E2E Gost',
        reservation_time: '2026-12-31T20:00:00',
        guests: 4,
      },
    })
    expect(r.ok()).toBeTruthy()
    const d = await r.json()
    expect(d.id).toBeTruthy()
  })

  test('8. Public menu', async ({ request }) => {
    const table = await request.post('/api/v1/tables', {
      headers: auth(), data: { name: `Pub-${Date.now()}`, capacity: 2 },
    }).then(r => r.json())

    const r = await request.get(`/api/v1/public/menu/${table.id}`)
    expect(r.ok()).toBeTruthy()
  })

  test('9. Fiscal status endpoint', async ({ request }) => {
    const r = await request.get('/api/v1/invoices/1/fiscal-status', { headers: auth() })
    expect(r.ok() || r.status() === 404).toBeTruthy()
  })

  test('10. FURS ZAPOS fiscalization endpoint', async ({ request }) => {
    const r = await request.post('/api/v1/invoices/1/furs-zapos', { headers: auth() })
    // May fail without cert, but endpoint should exist
    expect(r.ok() || r.status() === 400 || r.status() === 500).toBeTruthy()
  })

  test('11. Croatian fiscal endpoint', async ({ request }) => {
    const r = await request.post('/api/v1/invoices/1/croatian-fiscal', { headers: auth() })
    // May fail without cert, but endpoint should exist
    expect(r.ok() || r.status() === 400 || r.status() === 500).toBeTruthy()
  })
})
