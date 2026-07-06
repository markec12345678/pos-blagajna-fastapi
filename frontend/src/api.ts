import type { Category, TableData, Order, Dashboard, Customer } from './types'

const API = '/api/v1'
let token: string | null = null

export function h() {
  const r: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) r['Authorization'] = `Bearer ${token}`
  return r
}

export async function pinLogin(pin: string) {
  const res = await fetch(`${API}/auth/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
  const d = await res.json()
  if (!res.ok) throw new Error(d.detail || 'Invalid PIN')
  token = d.access_token; return d
}

export async function login(u: string, p: string) {
  const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) })
  const d = await res.json()
  if (!res.ok) throw new Error(d.detail || 'Login failed')
  token = d.access_token; return d
}

export function loggedIn() { return !!token }
export function authHeader() { const r: Record<string, string> = {}; if (token) r['Authorization'] = `Bearer ${token}`; return r }

/** Get current branch_id from localStorage */
export function branchId(): number { return parseInt(localStorage.getItem('pos-branch') || '0') || 0 }
function bq() { const b = branchId(); return b ? `&branch_id=${b}` : '' }

export async function getMenu(): Promise<Category[]> { const r = await fetch(`${API}/menu${bq() ? '?' + bq().slice(1).replace('&', '') : ''}`, { headers: h() }); return r.json() }
export async function getTables(): Promise<TableData[]> { const r = await fetch(`${API}/tables${bq() ? '?' + bq().slice(1).replace('&', '') : ''}`, { headers: h() }); return r.json() }
export async function getDashboard(): Promise<Dashboard> { const r = await fetch(`${API}/dashboard${bq() ? '?' + bq().slice(1).replace('&', '') : ''}`, { headers: h() }); return r.json() }
export async function getRecentOrders(lim = 20): Promise<Order[]> { const r = await fetch(`${API}/orders/history/recent?limit=${lim}${bq()}`, { headers: h() }); return r.json() }

export async function createOrder(tid: number, name: string | null, items: { menu_item_id: number; quantity: number; modifiers?: string; notes?: string }[], orderType = 'dine-in', customerId?: number, scheduledAt?: string, notes?: string) {
  const r = await fetch(`${API}/orders`, { method: 'POST', headers: h(), body: JSON.stringify({ table_id: tid, order_type: orderType, customer_name: name, customer_id: customerId, branch_id: branchId() || undefined, items, scheduled_at: scheduledAt || undefined, notes: notes || '' }) })
  const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d as Order
}

export async function addOrderItem(oid: number, mid: number, qty: number, modifiers = '[]', notes = '') {
  const r = await fetch(`${API}/orders/${oid}/items`, { method: 'POST', headers: h(), body: JSON.stringify({ menu_item_id: mid, quantity: qty, modifiers, notes }) })
  const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d
}

export async function getOrder(oid: number): Promise<Order> { const r = await fetch(`${API}/orders/${oid}`, { headers: h() }); return r.json() }
export async function getOrderByTable(tid: number): Promise<Order> { const r = await fetch(`${API}/orders/by-table/${tid}`, { headers: h() }); if (!r.ok) throw new Error('No open order'); return r.json() }
export async function getHeldOrder(tid: number): Promise<Order> { const r = await fetch(`${API}/orders/held/${tid}`, { headers: h() }); if (!r.ok) throw new Error('No held order'); return r.json() }

export async function makePayment(oid: number, amt: number, method: string, tip = 0) {
  const r = await fetch(`${API}/payments`, { method: 'POST', headers: h(), body: JSON.stringify({ order_id: oid, amount: amt, method, tip }) })
  const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d
}

export async function getKdsOrders(): Promise<any[]> { const r = await fetch(`${API}/kds/orders`, { headers: h() }); return r.json() }
export async function updateKdsItem(itemId: number, status: string) {
  const r = await fetch(`${API}/kds/items/${itemId}/status`, { method: 'POST', headers: h(), body: JSON.stringify({ status }) })
  return r.json()
}

export async function getIngredients(): Promise<any[]> { const r = await fetch(`${API}/inventory/ingredients${bq() ? '?' + bq().slice(1).replace('&', '') : ''}`, { headers: h() }); return r.json() }
export async function createIngredient(data: any) { const r = await fetch(`${API}/inventory/ingredients`, { method: 'POST', headers: h(), body: JSON.stringify({ ...data, branch_id: branchId() || undefined }) }); return r.json() }
export async function addStock(data: any) { const r = await fetch(`${API}/inventory/stock`, { method: 'POST', headers: h(), body: JSON.stringify(data) }); return r.json() }
export async function getLowStock(): Promise<any[]> { const r = await fetch(`${API}/inventory/low-stock${bq() ? '?' + bq().slice(1).replace('&', '') : ''}`, { headers: h() }); return r.json() }

export async function getUsers(): Promise<any[]> { const r = await fetch(`${API}/users`, { headers: h() }); return r.json() }

export async function getModifiersForItem(itemId: number): Promise<any[]> {
  const r = await fetch(`${API}/modifiers/by-item/${itemId}`, { headers: h() }); return r.json()
}

export async function searchCustomers(q: string): Promise<Customer[]> {
  const r = await fetch(`${API}/customers?search=${encodeURIComponent(q)}`, { headers: h() }); return r.json()
}

export async function createCustomer(data: { name: string; phone?: string; address?: string }): Promise<{ id: number; name: string }> {
  const r = await fetch(`${API}/customers`, { method: 'POST', headers: h(), body: JSON.stringify(data) })
  return r.json()
}

export async function getCourses(): Promise<{ id: number; name: string; sort_order: number }[]> {
  const r = await fetch(`${API}/courses`, { headers: h() }); return r.json()
}

export async function getSuppliers(): Promise<any[]> {
  const r = await fetch(`${API}/suppliers`, { headers: h() }); return r.json()
}

export async function createSupplier(data: any): Promise<any> {
  const r = await fetch(`${API}/suppliers`, { method: 'POST', headers: h(), body: JSON.stringify(data) }); return r.json()
}

export async function getPurchaseOrders(status?: string): Promise<any[]> {
  const q = status ? `?status=${status}` : ''
  const r = await fetch(`${API}/suppliers/orders${q}`, { headers: h() }); return r.json()
}

export async function createPurchaseOrder(data: any): Promise<any> {
  const r = await fetch(`${API}/suppliers/orders`, { method: 'POST', headers: h(), body: JSON.stringify(data) }); return r.json()
}

export async function receivePurchaseOrder(poId: number): Promise<any> {
  const r = await fetch(`${API}/suppliers/orders/${poId}/receive`, { method: 'POST', headers: h() }); return r.json()
}

export async function autoGeneratePO(): Promise<any> {
  const r = await fetch(`${API}/suppliers/orders/auto-generate`, { method: 'POST', headers: h() }); return r.json()
}

export async function getCustomerHistory(id: number): Promise<any> {
  const r = await fetch(`${API}/customers/${id}/history`, { headers: h() }); return r.json()
}

export async function moveOrderItems(itemIds: number[], targetOrderId: number): Promise<any> {
  const r = await fetch(`${API}/orders/move-items`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ item_ids: itemIds, target_order_id: targetOrderId }) })
  return r.json()
}
