import type { Category, TableData, Order, Dashboard, Customer, Ingredient, Supplier, User, MenuItem, ModifierGroup, PaginatedResponse } from './types'
import { cacheMenu, getCachedMenu, cacheTables, getCachedTables, cacheSettings, getCachedSettings, queueRequest, getQueueCount, replayQueue, cacheOrder, getCachedOrder } from './offline-cache'

const API = '/api/v1'
const TOKEN_KEY = 'pos_token'
let token: string | null = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('pos-token') || localStorage.getItem('token')

export function h() {
  const r: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) r['Authorization'] = `Bearer ${token}`
  return r
}

export async function pinLogin(pin: string) {
  const res = await fetch(`${API}/auth/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
  const d = await res.json()
  if (!res.ok) throw new Error(d.detail || 'Invalid PIN')
  token = d.access_token
  localStorage.setItem(TOKEN_KEY, token!)
  return d
}

export async function login(u: string, p: string) {
  const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) })
  const d = await res.json()
  if (!res.ok) throw new Error(d.detail || 'Login failed')
  token = d.access_token
  localStorage.setItem(TOKEN_KEY, token!)
  return d
}

export function logout() {
  token = null
  localStorage.removeItem(TOKEN_KEY)
}

export function loggedIn() { return !!token }
export function authHeader() { const r: Record<string, string> = {}; if (token) r['Authorization'] = `Bearer ${token}`; return r }

export function branchId(): number { return parseInt(localStorage.getItem('pos-branch') || '0') || 0 }
function bq() { const b = branchId(); return b ? `&branch_id=${b}` : '' }

export async function getMenu(): Promise<Category[]> {
  const url = `${API}/menu${bq() ? '?' + bq().slice(1).replace('&', '') : ''}`
  try {
    const r = await fetch(url, { headers: h() })
    const d = await r.json()
    if (!r.ok) throw new Error(d.detail || 'Request failed')
    cacheMenu(d)
    return d
  } catch (err) {
    if (navigator.onLine) throw err
    const cached = await getCachedMenu()
    if (cached) return cached as Category[]
    throw err
  }
}

export async function getTables(): Promise<TableData[]> {
  const url = `${API}/tables${bq() ? '?' + bq().slice(1).replace('&', '') : ''}`
  try {
    const r = await fetch(url, { headers: h() })
    const d = await r.json()
    if (!r.ok) throw new Error(d.detail || 'Request failed')
    cacheTables(d)
    return d
  } catch (err) {
    if (navigator.onLine) throw err
    const cached = await getCachedTables()
    if (cached) return cached as TableData[]
    throw err
  }
}

export async function getDashboard(): Promise<Dashboard> {
  const r = await fetch(`${API}/dashboard${bq() ? '?' + bq().slice(1).replace('&', '') : ''}`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function getRecentOrders(lim = 20): Promise<Order[]> {
  const r = await fetch(`${API}/orders/history/recent?limit=${lim}${bq()}`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function createOrder(tid: number, name: string | null, items: { menu_item_id: number; quantity: number; modifiers?: string; notes?: string }[], orderType = 'dine-in', customerId?: number, scheduledAt?: string, notes?: string) {
  const body = JSON.stringify({ table_id: tid, order_type: orderType, customer_name: name, customer_id: customerId, branch_id: branchId() || undefined, items, scheduled_at: scheduledAt || undefined, notes: notes || '' })
  try {
    const r = await fetch(`${API}/orders`, { method: 'POST', headers: h(), body })
    const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d as Order
  } catch (err) {
    if (!navigator.onLine && !navigator.onLine) {
      await queueRequest(`${API}/orders`, 'POST', h(), body)
      return { id: Date.now(), order_type: orderType, table_id: tid, cashier_id: 0, status: 'pending_sync', total: 0, discount_value: 0, discount_amount: 0, items: [], created_at: new Date().toISOString() } as Order
    }
    throw err
  }
}

export async function addOrderItem(oid: number, mid: number, qty: number, modifiers = '[]', notes = '') {
  const body = JSON.stringify({ menu_item_id: mid, quantity: qty, modifiers, notes })
  try {
    const r = await fetch(`${API}/orders/${oid}/items`, { method: 'POST', headers: h(), body })
    const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d
  } catch (err) {
    if (!navigator.onLine) {
      await queueRequest(`${API}/orders/${oid}/items`, 'POST', h(), body)
      return { queued: true }
    }
    throw err
  }
}

export async function getOrder(oid: number): Promise<Order> {
  const key = `order-${oid}`
  try {
    const r = await fetch(`${API}/orders/${oid}`, { headers: h() })
    const d = await r.json()
    if (!r.ok) throw new Error(d.detail || 'Request failed')
    cacheOrder(key, d)
    return d
  } catch (err) {
    if (!navigator.onLine) {
      const cached = await getCachedOrder(key)
      if (cached) return cached as Order
    }
    throw err
  }
}

export async function getOrderByTable(tid: number): Promise<Order> {
  const r = await fetch(`${API}/orders/by-table/${tid}`, { headers: h() })
  if (!r.ok) throw new Error('No open order')
  return r.json()
}

export async function getHeldOrder(tid: number): Promise<Order> {
  const r = await fetch(`${API}/orders/held/${tid}`, { headers: h() })
  if (!r.ok) throw new Error('No held order')
  return r.json()
}

export async function makePayment(oid: number, amt: number, method: string, tip = 0) {
  const body = JSON.stringify({ order_id: oid, amount: amt, method, tip })
  try {
    const r = await fetch(`${API}/payments`, { method: 'POST', headers: h(), body })
    const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d
  } catch (err) {
    if (!navigator.onLine) {
      await queueRequest(`${API}/payments`, 'POST', h(), body)
      return { queued: true, offline: true }
    }
    throw err
  }
}

export async function getKdsOrders(): Promise<any[]> {
  const r = await fetch(`${API}/kds/orders`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function updateKdsItem(itemId: number, status: string) {
  const body = JSON.stringify({ status })
  try {
    const r = await fetch(`${API}/kds/items/${itemId}/status`, { method: 'POST', headers: h(), body })
    return r.json()
  } catch (err) {
    if (!navigator.onLine) {
      await queueRequest(`${API}/kds/items/${itemId}/status`, 'POST', h(), body)
      return { queued: true }
    }
    throw err
  }
}

export async function getIngredients(): Promise<Ingredient[]> {
  const r = await fetch(`${API}/inventory/ingredients${bq() ? '?' + bq().slice(1).replace('&', '') : ''}`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function createIngredient(data: Partial<Ingredient>) {
  const r = await fetch(`${API}/inventory/ingredients`, { method: 'POST', headers: h(), body: JSON.stringify({ ...data, branch_id: branchId() || undefined }) })
  return r.json()
}

export async function addStock(data: { ingredient_id: number; quantity: number; reference?: string; notes?: string }) {
  const r = await fetch(`${API}/inventory/stock`, { method: 'POST', headers: h(), body: JSON.stringify(data) })
  return r.json()
}

export async function getLowStock(): Promise<Ingredient[]> {
  const r = await fetch(`${API}/inventory/low-stock${bq() ? '?' + bq().slice(1).replace('&', '') : ''}`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function getUsers(): Promise<User[]> {
  const r = await fetch(`${API}/users`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function getModifiersForItem(itemId: number): Promise<ModifierGroup[]> {
  const r = await fetch(`${API}/modifiers/by-item/${itemId}`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function searchCustomers(q: string): Promise<PaginatedResponse<Customer>> {
  const r = await fetch(`${API}/customers?search=${encodeURIComponent(q)}`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function createCustomer(data: { name: string; phone?: string; address?: string }): Promise<{ id: number; name: string }> {
  const r = await fetch(`${API}/customers`, { method: 'POST', headers: h(), body: JSON.stringify(data) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function getCourses(): Promise<{ id: number; name: string; sort_order: number }[]> {
  const r = await fetch(`${API}/courses`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function getSuppliers(): Promise<Supplier[]> {
  const r = await fetch(`${API}/suppliers`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function createSupplier(data: Partial<Supplier>): Promise<Supplier> {
  const r = await fetch(`${API}/suppliers`, { method: 'POST', headers: h(), body: JSON.stringify(data) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function getPurchaseOrders(status?: string): Promise<{ id: number; supplier_id: number; status: string; total: number }[]> {
  const q = status ? `?status=${status}` : ''
  const r = await fetch(`${API}/suppliers/orders${q}`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function createPurchaseOrder(data: { supplier_id: number; items: { ingredient_id: number; quantity: number }[] }): Promise<{ id: number; status: string }> {
  const r = await fetch(`${API}/suppliers/orders`, { method: 'POST', headers: h(), body: JSON.stringify(data) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function receivePurchaseOrder(poId: number): Promise<{ status: string }> {
  const r = await fetch(`${API}/suppliers/orders/${poId}/receive`, { method: 'POST', headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function autoGeneratePO(): Promise<{ created: number }> {
  const r = await fetch(`${API}/suppliers/orders/auto-generate`, { method: 'POST', headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function getCustomerHistory(id: number): Promise<{ orders: Order[]; total_spent: number; visit_count: number }> {
  const r = await fetch(`${API}/customers/${id}/history`, { headers: h() })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export async function bulkDeleteCustomers(ids: number[]): Promise<{ deleted: number }> {
  const r = await fetch(`${API}/customers/bulk/delete`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Bulk delete failed')
  return d
}

export async function bulkTagCustomers(ids: number[], tag: string): Promise<{ tagged: number }> {
  const r = await fetch(`${API}/customers/bulk/tag`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, tag }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Bulk tag failed')
  return d
}

export async function bulkDeleteSuppliers(ids: number[]): Promise<{ deleted: number; skipped: number }> {
  const r = await fetch(`${API}/suppliers/bulk/delete`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Bulk delete failed')
  return d
}

export async function bulkUpdatePOStatus(ids: number[], status: string): Promise<{ updated: number }> {
  const r = await fetch(`${API}/suppliers/orders/bulk/status`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, status }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Bulk status update failed')
  return d
}

export async function bulkDeletePOs(ids: number[]): Promise<{ deleted: number }> {
  const r = await fetch(`${API}/suppliers/orders/bulk/delete`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Bulk delete failed')
  return d
}

export async function bulkCloseShifts(ids: number[]): Promise<{ closed: number }> {
  const r = await fetch(`${API}/shifts/bulk/close`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Bulk close failed')
  return d
}

export async function bulkDeleteShifts(ids: number[]): Promise<{ deleted: number }> {
  const r = await fetch(`${API}/shifts/bulk/delete`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Bulk delete failed')
  return d
}

export async function bulkSendEracun(ids: number[]): Promise<{ sent: number; results: any[] }> {
  const r = await fetch(`${API}/invoices/bulk/send-eracun`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Bulk send failed')
  return d
}

export async function bulkUpdateEracunStatus(ids: number[], status: string): Promise<{ updated: number }> {
  const r = await fetch(`${API}/invoices/bulk/status`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, status }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Bulk status update failed')
  return d
}

export async function bulkDeleteInvoices(ids: number[]): Promise<{ deleted: number }> {
  const r = await fetch(`${API}/invoices/bulk/delete`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Bulk delete failed')
  return d
}

export async function validateInvoiceEracun(invoiceId: number): Promise<{ valid: boolean; errors: string[]; hash: string; uuid: string; xml_length: number }> {
  const r = await fetch(`${API}/invoices/${invoiceId}/validate`, { headers: h() })
  if (!r.ok) throw new Error('Validation failed')
  return r.json()
}

export async function getInvoiceStats(): Promise<any> {
  const r = await fetch(`${API}/invoices/stats`, { headers: h() })
  if (!r.ok) throw new Error('Stats failed')
  return r.json()
}

export async function eracunList(): Promise<any[]> {
  const r = await fetch(`${API}/invoices`, { headers: h() })
  if (!r.ok) throw new Error('Failed to load invoices')
  return r.json()
}

export async function createCreditNote(invoiceId: number, reason: string): Promise<any> {
  const r = await fetch(`${API}/invoices/${invoiceId}/credit-note`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Credit note failed')
  return d
}

export async function downloadEracunBatch(): Promise<void> {
  const r = await fetch(`${API}/invoices/export-xml`, { headers: h() })
  if (!r.ok) throw new Error('Export failed')
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `eracun-batch-${new Date().toISOString().slice(0, 10)}.xml`; a.click()
  URL.revokeObjectURL(url)
}

export async function moveOrderItems(itemIds: number[], targetOrderId: number): Promise<{ ok: boolean; moved: number }> {
  const r = await fetch(`${API}/orders/move-items`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ item_ids: itemIds, target_order_id: targetOrderId }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Request failed')
  return d
}

export function isOnline(): boolean {
  return navigator.onLine
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase()
    return msg.includes('network') || msg.includes('failed to fetch') || msg.includes('load') || msg.includes('offline')
  }
  return false
}

export async function getOfflineQueueCount(): Promise<number> {
  return getQueueCount()
}

export async function checkItemStock(menuItemId: number, quantity: number = 1): Promise<{ warnings: any[]; has_warnings: boolean }> {
  const r = await fetch(`${API}/inventory/check-stock/${menuItemId}?quantity=${quantity}`, { headers: h() })
  if (!r.ok) throw new Error('Stock check failed')
  return r.json()
}

export async function getTableAvailability(reservationTime: string, branchId?: number): Promise<{ tables: any[] }> {
  const url = `${API}/reservations/availability?reservation_time=${encodeURIComponent(reservationTime)}${branchId ? `&branch_id=${branchId}` : ''}`
  const r = await fetch(url, { headers: h() })
  if (!r.ok) throw new Error('Availability check failed')
  return r.json()
}

export async function breakStart(shiftId: number): Promise<any> {
  const r = await fetch(`${API}/shifts/${shiftId}/break-start`, { method: 'POST', headers: h() })
  if (!r.ok) { const d = await r.json(); throw new Error(d.detail || 'Break start failed') }
  return r.json()
}

export async function breakEnd(shiftId: number): Promise<any> {
  const r = await fetch(`${API}/shifts/${shiftId}/break-end`, { method: 'POST', headers: h() })
  if (!r.ok) { const d = await r.json(); throw new Error(d.detail || 'Break end failed') }
  return r.json()
}

export async function toggleItem86(itemId: number): Promise<any> {
  const r = await fetch(`${API}/menu/items/${itemId}/toggle-oos`, { method: 'POST', headers: h() })
  if (!r.ok) { const d = await r.json(); throw new Error(d.detail || 'Toggle failed') }
  return r.json()
}

export async function calculatePromotion(cartItems: any[], total: number, branchId?: number): Promise<any> {
  const r = await fetch(`${API}/promotions/calculate`, {
    method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: cartItems, total, branch_id: branchId || 0 })
  })
  if (!r.ok) return null
  return r.json()
}

export async function transferOrder(orderId: number, targetTableId: number): Promise<any> {
  const r = await fetch(`${API}/orders/${orderId}/transfer`, {
    method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_table_id: targetTableId })
  })
  if (!r.ok) { const d = await r.json(); throw new Error(d.detail || 'Transfer failed') }
  return r.json()
}

export async function createSwapRequest(data: { shift_date: string; original_start: string; original_end: string; target_user_id?: number; type?: string; notes?: string }): Promise<any> {
  const r = await fetch(`${API}/shifts/swap-requests`, {
    method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!r.ok) { const d = await r.json(); throw new Error(d.detail || 'Request failed') }
  return r.json()
}

export async function listSwapRequests(status = 'pending'): Promise<any[]> {
  const r = await fetch(`${API}/shifts/swap-requests?status=${status}`, { headers: h() })
  if (!r.ok) return []
  return r.json()
}

export async function respondSwapRequest(reqId: number, status: string, responseNotes = ''): Promise<any> {
  const r = await fetch(`${API}/shifts/swap-requests/${reqId}`, {
    method: 'PUT', headers: { ...h(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, response_notes: responseNotes })
  })
  if (!r.ok) { const d = await r.json(); throw new Error(d.detail || 'Response failed') }
  return r.json()
}

export async function cancelSwapRequest(reqId: number): Promise<any> {
  const r = await fetch(`${API}/shifts/swap-requests/${reqId}`, { method: 'DELETE', headers: h() })
  if (!r.ok) { const d = await r.json(); throw new Error(d.detail || 'Cancel failed') }
  return r.json()
}

export async function getBirthdayMembers(): Promise<any[]> {
  const r = await fetch(`${API}/loyalty/birthdays`, { headers: h() })
  if (!r.ok) return []
  return r.json()
}

export async function syncOfflineQueue(): Promise<number> {
  return replayQueue(authHeader)
}

export function queueForRetry<T>(fn: () => Promise<T>): Promise<{ queued: false; result: T } | { queued: true }> {
  return fn().then(
    (result) => ({ queued: false as const, result }),
    async (err) => {
      if (!isOnline() && isNetworkError(err)) {
        return { queued: true as const }
      }
      throw err
    }
  )
}

export async function getUpsellSuggestions(cartItems: { name: string; price: number; category_id?: number; quantity?: number }[], total: number = 0) {
  const r = await fetch(`${API}/upsell/suggestions`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ cart_items: cartItems, total, hour: new Date().getHours() })
  })
  if (!r.ok) return []
  const d = await r.json()
  return d.suggestions || []
}

export async function getSmartPromos(cartItems: { name: string; price: number; quantity?: number }[], total: number = 0, customerId?: number) {
  const r = await fetch(`${API}/upsell/smart-promo`, {
    method: 'POST', headers: h(),
body: JSON.stringify({ cart_items: cartItems, total, customer_id: customerId, hour: new Date().getHours() })
})
if (!r.ok) return { promos: [], total_savings: 0 }
return r.json()
}

// Voice ordering
export async function parseVoiceOrder(text: string) {
  const r = await fetch(`${API}/voice/parse-order`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ text })
  })
  return r.json()
}

export async function voiceSearchMenu(query: string) {
  const r = await fetch(`${API}/voice/search`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ query })
  })
  return r.json()
}

export async function getVoiceCommands() {
const r = await fetch(`${API}/voice/commands`, authHeader())
return r.json()
}

// KDS Timers
export async function startKDSTimer(orderId: number, station?: string) {
  const r = await fetch(`${API}/kds-timers/start`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ order_id: orderId, station })
  })
  return r.json()
}

export async function completeKDSTimer(timerId: number) {
  const r = await fetch(`${API}/kds-timers/${timerId}/complete`, { ...authHeader(), method: 'PUT' })
  return r.json()
}

export async function getActiveKDSTimers() {
  const r = await fetch(`${API}/kds-timers/active`, authHeader())
  return r.json()
}

export async function getKDSTimerStats(days: number = 7) {
  const r = await fetch(`${API}/kds-timers/stats?days=${days}`, authHeader())
  return r.json()
}

// Notifications
export async function getNotifications(unreadOnly = false) {
  const r = await fetch(`${API}/notifications/?unread_only=${unreadOnly}`, authHeader())
  return r.json()
}

export async function markNotificationRead(id: number) {
  const r = await fetch(`${API}/notifications/${id}/read`, { ...authHeader(), method: 'PUT' })
  return r.json()
}

export async function markAllNotificationsRead() {
  const r = await fetch(`${API}/notifications/read-all`, { ...authHeader(), method: 'PUT' })
  return r.json()
}

// Auto-schedule
export async function autoSchedule(startDate: string, endDate: string, minPerShift = 2, maxPerShift = 5) {
  const r = await fetch(`${API}/schedule-calendar/auto-schedule`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({
      start_date: startDate, end_date: endDate,
      min_per_shift: minPerShift, max_per_shift: maxPerShift
    })
  })
  return r.json()
}

// Access Control
export async function checkPageAccess(page: string) {
  const r = await fetch(`${API}/access-control/check/${encodeURIComponent(page)}`, {
    method: 'POST', headers: h()
  })
  return r.json()
}

export async function getUserPages() {
  const r = await fetch(`${API}/access-control/pages`, authHeader())
  return r.json()
}

// AI Menu Suggestions
export async function getAISuggestions(weather?: string, temperature?: number, timeOfDay?: string, category?: string, limit = 10) {
  const params = new URLSearchParams()
  if (weather) params.append('weather', weather)
  if (temperature) params.append('temperature', temperature.toString())
  if (timeOfDay) params.append('time_of_day', timeOfDay)
  if (category) params.append('category', category)
  params.append('limit', limit.toString())
  const r = await fetch(`${API}/ai-menu/suggestions?${params}`, authHeader())
  return r.json()
}

export async function getWeatherMenu() {
  const r = await fetch(`${API}/ai-menu/weather-menu`, authHeader())
  return r.json()
}

export async function getPopularTimes(dayOfWeek?: number) {
  const params = dayOfWeek !== undefined ? `?day_of_week=${dayOfWeek}` : ''
  const r = await fetch(`${API}/ai-menu/popular-times${params}`, authHeader())
  return r.json()
}

// Loyalty Real-time
export async function getCustomerPoints(customerId: number) {
  const r = await fetch(`${API}/loyalty-realtime/customer/${customerId}/points`, authHeader())
  return r.json()
}

export async function earnLoyaltyPoints(customerId: number, amount: number, description?: string) {
  const r = await fetch(`${API}/loyalty-realtime/customer/${customerId}/earn?amount=${amount}&description=${encodeURIComponent(description || '')}`, {
    ...authHeader(), method: 'POST'
  })
  return r.json()
}

export async function redeemLoyaltyPoints(customerId: number, points: number, description?: string) {
  const r = await fetch(`${API}/loyalty-realtime/customer/${customerId}/redeem?points=${points}&description=${encodeURIComponent(description || '')}`, {
    ...authHeader(), method: 'POST'
  })
  return r.json()
}

export async function getLoyaltyLeaderboard(limit = 10) {
  const r = await fetch(`${API}/loyalty-realtime/leaderboard?limit=${limit}`, authHeader())
  return r.json()
}

export async function getLoyaltyRewards() {
  const r = await fetch(`${API}/loyalty-realtime/rewards`, authHeader())
  return r.json()
}

// Supplier Auto-order
export async function getLowStockItems() {
  const r = await fetch(`${API}/supplier-auto/low-stock`, authHeader())
  return r.json()
}

export async function getAutoOrderRules() {
  const r = await fetch(`${API}/supplier-auto/rules`, authHeader())
  return r.json()
}

export async function createSupplierOrder(supplierId: number, items: { ingredient_id: number; quantity: number }[]) {
  const r = await fetch(`${API}/supplier-auto/create-order?supplier_id=${supplierId}`, {
    method: 'POST', headers: h(),
    body: JSON.stringify(items)
  })
  return r.json()
}

export async function autoReorder() {
  const r = await fetch(`${API}/supplier-auto/auto-reorder`, { ...authHeader(), method: 'POST' })
  return r.json()
}

export async function getSupplierOrderStats(days = 30) {
  const r = await fetch(`${API}/supplier-auto/stats?days=${days}`, authHeader())
  return r.json()
}

// Shift Swap
export async function getSwapRequests() {
  const r = await fetch(`${API}/shift-swap/requests`, authHeader())
  return r.json()
}

export async function requestShiftSwap(shiftId: number, targetUserId: number, reason?: string) {
  const r = await fetch(`${API}/shift-swap/request`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ shift_id: shiftId, target_user_id: targetUserId, reason })
  })
  return r.json()
}

export async function approveShiftSwap(swapId: number, approved: boolean, note?: string) {
  const r = await fetch(`${API}/shift-swap/approve`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ swap_id: swapId, approved, note })
  })
  return r.json()
}

export async function getMySchedule(weeks = 2) {
  const r = await fetch(`${API}/shift-swap/my-schedule?weeks=${weeks}`, authHeader())
  return r.json()
}

export async function getSwapAvailability(shiftId: number) {
  const r = await fetch(`${API}/shift-swap/availability?shift_id=${shiftId}`, authHeader())
  return r.json()
}

// Reservation auto-assign
export async function autoAssignTable(reservationTime: string, guests: number, branchId?: number) {
  const params = new URLSearchParams({ reservation_time: reservationTime, guests: guests.toString() })
  if (branchId) params.append('branch_id', branchId.toString())
  const r = await fetch(`${API}/reservations/auto-assign?${params}`, authHeader())
  return r.json()
}

export async function getReservationTimeline(date?: string) {
  const params = date ? `?date=${date}` : ''
  const r = await fetch(`${API}/reservations/timeline${params}`, authHeader())
  return r.json()
}

export async function getReservationCalendar(year?: number, month?: number) {
  const params = new URLSearchParams()
  if (year) params.append('year', year.toString())
  if (month) params.append('month', month.toString())
  const r = await fetch(`${API}/reservations/calendar?${params}`, authHeader())
  return r.json()
}

export async function getReservationTableAvailability(date?: string) {
  const params = date ? `?date=${date}` : ''
  const r = await fetch(`${API}/reservations/table-availability${params}`, authHeader())
  return r.json()
}

// Dashboard Real-time
export async function getDashboardRealtime() {
  const r = await fetch(`${API}/dashboard/realtime`, authHeader())
  return r.json()
}

export async function getDashboardPerformance(days = 7) {
  const r = await fetch(`${API}/dashboard/performance?days=${days}`, authHeader())
  return r.json()
}

// Employee Performance Advanced
export async function getEmployeePerformanceSummary(days = 30) {
  const r = await fetch(`${API}/employee-performance/summary?days=${days}`, authHeader())
  return r.json()
}

export async function getEmployeeDetail(userId: number, days = 30) {
  const r = await fetch(`${API}/employee-performance/detail/${userId}?days=${days}`, authHeader())
  return r.json()
}

export async function getPerformanceLeaderboard(metric = 'sales', limit = 10, days = 30) {
  const r = await fetch(`${API}/employee-performance/leaderboard?metric=${metric}&limit=${limit}&days=${days}`, authHeader())
  return r.json()
}

export async function getEmployeeGoals(userId?: number) {
  const params = userId ? `?user_id=${userId}` : ''
  const r = await fetch(`${API}/employee-performance/goals${params}`, authHeader())
  return r.json()
}

// Inventory Alerts
export async function getInventoryAlertRules() {
  const r = await fetch(`${API}/inventory-alerts/rules`, authHeader())
  return r.json()
}

export async function getActiveAlerts() {
  const r = await fetch(`${API}/inventory-alerts/active`, authHeader())
  return r.json()
}

export async function autoOrderLowStock() {
  const r = await fetch(`${API}/inventory-alerts/auto-order`, { ...authHeader(), method: 'POST' })
  return r.json()
}

export async function getAlertStatistics() {
  const r = await fetch(`${API}/inventory-alerts/statistics`, authHeader())
  return r.json()
}

// Menu Images
export async function uploadMenuImage(itemId: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const r = await fetch(`${API}/menu-images/upload/${itemId}`, {
    ...authHeader(),
    method: 'POST',
    body: formData,
  })
  return r.json()
}

export async function deleteMenuImage(itemId: number) {
  const r = await fetch(`${API}/menu-images/${itemId}`, { ...authHeader(), method: 'DELETE' })
  return r.json()
}

export async function getMenuImage(itemId: number) {
  const r = await fetch(`${API}/menu-images/${itemId}`, authHeader())
  return r.json()
}

// Menu Allergens
export async function getAllAllergens() {
  const r = await fetch(`${API}/menu-allergens/list`, authHeader())
  return r.json()
}

export async function getItemAllergens(itemId: number) {
  const r = await fetch(`${API}/menu-allergens/item/${itemId}`, authHeader())
  return r.json()
}

export async function updateItemAllergens(itemId: number, allergenCodes: string[]) {
  const r = await fetch(`${API}/menu-allergens/item/${itemId}`, {
    method: 'POST', headers: h(),
    body: JSON.stringify(allergenCodes)
  })
  return r.json()
}

export async function searchAllergenFree(excludeAllergens: string[]) {
  const params = excludeAllergens.length > 0 ? `?exclude_allergens=${excludeAllergens.join(',')}` : ''
  const r = await fetch(`${API}/menu-allergens/search${params}`, authHeader())
  return r.json()
}

export async function getAllergenStats() {
  const r = await fetch(`${API}/menu-allergens/stats`, authHeader())
  return r.json()
}

// Order Tracking
export async function getOrderTracking(orderId: number) {
  const r = await fetch(`${API}/order-tracking/${orderId}`, authHeader())
  return r.json()
}

export async function updateOrderTrackingStatus(orderId: number, status: string, note?: string) {
  const r = await fetch(`${API}/order-tracking/${orderId}/status`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ status, note })
  })
  return r.json()
}

export async function updateItemTrackingStatus(orderId: number, itemId: number, status: string) {
  const r = await fetch(`${API}/order-tracking/${orderId}/items/${itemId}/status`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ status })
  })
  return r.json()
}

export async function getOrderTimeline(orderId: number) {
  const r = await fetch(`${API}/order-tracking/${orderId}/timeline`, authHeader())
  return r.json()
}

export async function getActiveOrdersForTracking() {
  const r = await fetch(`${API}/order-tracking/active`, authHeader())
  return r.json()
}

// Floor Plan
export async function getFloorPlan(branchId?: number) {
  const params = branchId ? `?branch_id=${branchId}` : ''
  const r = await fetch(`${API}/tables/floor-plan${params}`, authHeader())
  return r.json()
}

export async function saveFloorLayout(tables: { id: number; pos_x: number; pos_y: number; shape?: string }[]) {
  const r = await fetch(`${API}/tables/layout`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ tables })
  })
  return r.json()
}

export async function batchUpdateTables(updates: { id: number; pos_x?: number; pos_y?: number; shape?: string; capacity?: number }[]) {
  const r = await fetch(`${API}/tables/batch-update`, {
    method: 'POST', headers: h(),
    body: JSON.stringify(updates)
  })
  return r.json()
}

export async function transferTable(fromTableId: number, toTableId: number) {
  const r = await fetch(`${API}/tables/transfer?from_table_id=${fromTableId}&to_table_id=${toTableId}`, {
    ...authHeader(), method: 'POST'
  })
  return r.json()
}
