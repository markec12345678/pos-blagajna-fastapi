import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

vi.mock('../offline-cache', () => ({
  cacheMenu: vi.fn(),
  getCachedMenu: vi.fn().mockReturnValue(null),
  cacheTables: vi.fn(),
  getCachedTables: vi.fn().mockReturnValue(null),
  cacheSettings: vi.fn(),
  getCachedSettings: vi.fn().mockReturnValue(null),
  queueRequest: vi.fn().mockResolvedValue(undefined),
  getQueueCount: vi.fn().mockReturnValue(0),
  replayQueue: vi.fn().mockReturnValue(0),
  cacheOrder: vi.fn(),
  getCachedOrder: vi.fn().mockReturnValue(null),
}))

import * as api from '../api'

const mockFetch = vi.fn()

function mockOk(data: any) {
  return { ok: true, json: () => Promise.resolve(data) } as Response
}

function mockFail(status = 400, detail = 'Error') {
  return { ok: false, json: () => Promise.resolve({ detail }) } as Response
}

describe('api.ts — comprehensive', () => {
  beforeEach(() => {
    localStorage.clear()
    api.logout()
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── Auth ──
  describe('auth', () => {
    it('h() with token', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ access_token: 'jwt' }))
      await api.login('admin', 'admin')
      const headers = api.h()
      expect(headers['Authorization']).toBe('Bearer jwt')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('loggedIn() true after login', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ access_token: 'tok' }))
      await api.login('admin', 'admin')
      expect(api.loggedIn()).toBe(true)
    })

    it('logout clears', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ access_token: 'tok' }))
      await api.login('admin', 'admin')
      api.logout()
      expect(api.loggedIn()).toBe(false)
      expect(api.h()['Authorization']).toBeUndefined()
    })

    it('branchId set/get', () => {
      localStorage.setItem('pos-branch', '5')
      expect(api.branchId()).toBe(5)
    })

    it('pinLogin', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ access_token: 'pin-tok' }))
      const result = await api.pinLogin('1234')
      expect(result.access_token).toBe('pin-tok')
    })
  })

  // ── Menu ──
  describe('getMenu', () => {
    it('fetches menu', async () => {
      const data = [{ id: 1, name: 'Pizza', items: [] }]
      mockFetch.mockResolvedValueOnce(mockOk(data))
      const result = await api.getMenu()
      expect(result).toEqual(data)
    })

    it('throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(400))
      await expect(api.getMenu()).rejects.toThrow()
    })

    it('getMenuImage', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ url: '/img/menu.jpg' }))
      const result = await api.getMenuImage(1)
      expect(result.url).toContain('menu.jpg')
    })

    it('uploadMenuImage', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ url: '/img/new.jpg' }))
      const result = await api.uploadMenuImage(1, new File([], 'test.jpg'))
      expect(result.url).toContain('new.jpg')
    })

    it('deleteMenuImage', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.deleteMenuImage(1)
      expect(result.ok).toBe(true)
    })
  })

  // ── Tables ──
  describe('getTables', () => {
    it('fetches tables', async () => {
      const data = [{ id: 1, name: 'T1', status: 'free' }]
      mockFetch.mockResolvedValueOnce(mockOk(data))
      const result = await api.getTables()
      expect(result).toEqual(data)
    })

    it('batchUpdateTables', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ updated: 3 }))
      const result = await api.batchUpdateTables([{ id: 1, status: 'reserved' }])
      expect(result.updated).toBe(3)
    })

    it('getFloorPlan', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ tables: [] }))
      const result = await api.getFloorPlan()
      expect(result.tables).toHaveLength(0)
    })

    it('saveFloorLayout', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.saveFloorLayout({ tables: [] })
      expect(result.ok).toBe(true)
    })

    it('getTableAvailability', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ tables: [] }))
      const result = await api.getTableAvailability('2026-07-18T18:00')
      expect(result.tables).toHaveLength(0)
    })

    it('transferTable', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.transferTable(1, 2)
      expect(result.ok).toBe(true)
    })

    it('autoAssignTable', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ table_id: 3 }))
      const result = await api.autoAssignTable('2026-07-18T18:00', 4)
      expect(result.table_id).toBe(3)
    })
  })

  // ── Dashboard ──
  describe('getDashboard', () => {
    it('fetches dashboard', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ revenue: 1000 }))
      const result = await api.getDashboard()
      expect(result.revenue).toBe(1000)
    })

    it('getDashboardRealtime', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ orders: 5 }))
      const result = await api.getDashboardRealtime()
      expect(result.orders).toBe(5)
    })

    it('getDashboardPerformance', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ avg_prep_time: 300 }))
      const result = await api.getDashboardPerformance()
      expect(result.avg_prep_time).toBe(300)
    })

    it('getPerformanceLeaderboard', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getPerformanceLeaderboard()
      expect(result).toHaveLength(0)
    })

    it('getPopularTimes', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getPopularTimes()
      expect(result).toHaveLength(0)
    })
  })

  // ── Orders ──
  describe('createOrder', () => {
    it('creates order', async () => {
      const order = { id: 1, status: 'open', items: [] }
      mockFetch.mockResolvedValueOnce(mockOk(order))
      const result = await api.createOrder(1, 'Janez', [{ menu_item_id: 1, quantity: 1 }])
      expect(result.id).toBe(1)
    })

    it('throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(400))
      await expect(api.createOrder(1, null, [])).rejects.toThrow()
    })
  })

  describe('getOrder', () => {
    it('fetches order', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1 }))
      const result = await api.getOrder(1)
      expect(result.id).toBe(1)
    })
  })

  describe('getOrderByTable', () => {
    it('fetches order by table', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1 }))
      const result = await api.getOrderByTable(1)
      expect(result.id).toBe(1)
    })
  })

  describe('getHeldOrder', () => {
    it('fetches held order', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1, status: 'held' }))
      const result = await api.getHeldOrder(1)
      expect(result.status).toBe('held')
    })

    it('throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(404))
      await expect(api.getHeldOrder(999)).rejects.toThrow()
    })
  })

  describe('addOrderItem', () => {
    it('adds item to order', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.addOrderItem(1, 2, 1)
      expect(result.ok).toBe(true)
    })
  })

  describe('getRecentOrders', () => {
    it('fetches recent orders', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getRecentOrders()
      expect(result).toHaveLength(0)
    })
  })

  describe('getOrderTimeline', () => {
    it('fetches order timeline', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getOrderTimeline(1)
      expect(result).toHaveLength(0)
    })
  })

  describe('getOrderTracking', () => {
    it('fetches order tracking', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ status: 'pending' }))
      const result = await api.getOrderTracking(1)
      expect(result.status).toBe('pending')
    })
  })

  describe('updateOrderTrackingStatus', () => {
    it('updates tracking status', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.updateOrderTrackingStatus(1, 'preparing')
      expect(result.ok).toBe(true)
    })
  })

  describe('updateItemTrackingStatus', () => {
    it('updates item tracking', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.updateItemTrackingStatus(1, 'ready')
      expect(result.ok).toBe(true)
    })
  })

  describe('getActiveOrdersForTracking', () => {
    it('fetches active tracking', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getActiveOrdersForTracking()
      expect(result).toHaveLength(0)
    })
  })

  describe('moveOrderItems', () => {
    it('moves order items', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true, moved: 2 }))
      const result = await api.moveOrderItems([1, 2], 3)
      expect(result.ok).toBe(true)
    })
  })

  describe('transferOrder', () => {
    it('transfers order', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.transferOrder(1, 2)
      expect(result.ok).toBe(true)
    })
  })

  // ── Payments ──
  describe('makePayment', () => {
    it('makes payment', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1, amount: 10 }))
      const result = await api.makePayment(1, 10, 'cash')
      expect(result.amount).toBe(10)
    })
  })

  // ── KDS ──
  describe('KDS', () => {
    it('getKdsOrders', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([{ id: 1 }]))
      const result = await api.getKdsOrders()
      expect(result).toHaveLength(1)
    })

    it('getKdsOrders throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(500))
      await expect(api.getKdsOrders()).rejects.toThrow()
    })

    it('updateKdsItem', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.updateKdsItem(1, 'ready')
      expect(result.ok).toBe(true)
    })

    it('startKDSTimer', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1 }))
      const result = await api.startKDSTimer(1)
      expect(result.id).toBe(1)
    })

    it('completeKDSTimer', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.completeKDSTimer(1)
      expect(result.ok).toBe(true)
    })

    it('getActiveKDSTimers', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getActiveKDSTimers()
      expect(result).toHaveLength(0)
    })

    it('getKDSTimerStats', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ avg: 120 }))
      const result = await api.getKDSTimerStats()
      expect(result.avg).toBe(120)
    })
  })

  // ── Inventory ──
  describe('inventory', () => {
    it('getIngredients', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([{ id: 1, name: 'Moka' }]))
      const result = await api.getIngredients()
      expect(result[0].name).toBe('Moka')
    })

    it('getIngredients throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(400))
      await expect(api.getIngredients()).rejects.toThrow()
    })

    it('createIngredient', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1 }))
      const result = await api.createIngredient({ name: 'Moka', unit: 'kg' })
      expect(result.id).toBe(1)
    })

    it('addStock', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.addStock({ ingredient_id: 1, quantity: 10 })
      expect(result.ok).toBe(true)
    })

    it('getLowStock', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getLowStock()
      expect(result).toHaveLength(0)
    })

    it('getLowStock throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(500))
      await expect(api.getLowStock()).rejects.toThrow()
    })

    it('getLowStockItems', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getLowStockItems()
      expect(result).toHaveLength(0)
    })

    it('checkItemStock', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ sufficient: true }))
      const result = await api.checkItemStock(1)
      expect(result.sufficient).toBe(true)
    })

    it('getInventoryAlertRules', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getInventoryAlertRules()
      expect(result).toHaveLength(0)
    })

    it('toggleItem86', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ is_86: true }))
      const result = await api.toggleItem86(1)
      expect(result.is_86).toBe(true)
    })
  })

  // ── Users ──
  describe('getUsers', () => {
    it('fetches users', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([{ id: 1, username: 'admin' }]))
      const result = await api.getUsers()
      expect(result[0].username).toBe('admin')
    })

    it('throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(403))
      await expect(api.getUsers()).rejects.toThrow()
    })

    it('getUserPages', async () => {
      mockFetch.mockResolvedValueOnce(mockOk(['pos', 'dashboard']))
      const result = await api.getUserPages()
      expect(result).toHaveLength(2)
    })
  })

  // ── Customers ──
  describe('customers', () => {
    it('searchCustomers', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ items: [], total: 0 }))
      const result = await api.searchCustomers('Janez')
      expect(result.total).toBe(0)
    })

    it('searchCustomers throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(400))
      await expect(api.searchCustomers('x')).rejects.toThrow()
    })

    it('createCustomer', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1, name: 'Janez' }))
      const result = await api.createCustomer({ name: 'Janez', phone: '040123' })
      expect(result.name).toBe('Janez')
    })

    it('getCustomerHistory', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ orders: [], total_spent: 0, visit_count: 0 }))
      const result = await api.getCustomerHistory(1)
      expect(result.visit_count).toBe(0)
    })

    it('bulkDeleteCustomers', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ deleted: 2 }))
      const result = await api.bulkDeleteCustomers([1, 2])
      expect(result.deleted).toBe(2)
    })

    it('bulkTagCustomers', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ tagged: 2 }))
      const result = await api.bulkTagCustomers([1, 2], 'vip')
      expect(result.tagged).toBe(2)
    })
  })

  // ── Courses ──
  describe('getCourses', () => {
    it('fetches courses', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([{ id: 1, name: 'Predjed' }]))
      const result = await api.getCourses()
      expect(result[0].name).toBe('Predjed')
    })
  })

  // ── Suppliers ──
  describe('suppliers', () => {
    it('getSuppliers', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([{ id: 1, name: 'Dobavitelj' }]))
      const result = await api.getSuppliers()
      expect(result[0].name).toBe('Dobavitelj')
    })

    it('getSuppliers throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(500))
      await expect(api.getSuppliers()).rejects.toThrow()
    })

    it('createSupplier', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1 }))
      const result = await api.createSupplier({ name: 'New' })
      expect(result.id).toBe(1)
    })

    it('getPurchaseOrders', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getPurchaseOrders()
      expect(result).toHaveLength(0)
    })

    it('createPurchaseOrder', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1, status: 'pending' }))
      const result = await api.createPurchaseOrder({ supplier_id: 1, items: [] })
      expect(result.status).toBe('pending')
    })

    it('receivePurchaseOrder', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ status: 'received' }))
      const result = await api.receivePurchaseOrder(1)
      expect(result.status).toBe('received')
    })

    it('autoGeneratePO', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ created: 3 }))
      const result = await api.autoGeneratePO()
      expect(result.created).toBe(3)
    })

    it('bulkDeleteSuppliers', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ deleted: 2 }))
      const result = await api.bulkDeleteSuppliers([1, 2])
      expect(result.deleted).toBe(2)
    })

    it('bulkDeletePOs', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ deleted: 3 }))
      const result = await api.bulkDeletePOs([1, 2, 3])
      expect(result.deleted).toBe(3)
    })

    it('bulkUpdatePOStatus', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ updated: 2 }))
      const result = await api.bulkUpdatePOStatus([1, 2], 'received')
      expect(result.updated).toBe(2)
    })

    it('createSupplierOrder', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1 }))
      const result = await api.createSupplierOrder(1, [{ ingredient_id: 1, quantity: 10 }])
      expect(result.id).toBe(1)
    })

    it('autoOrderLowStock', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ created: 3 }))
      const result = await api.autoOrderLowStock()
      expect(result.created).toBe(3)
    })

    it('autoReorder', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ordered: 2 }))
      const result = await api.autoReorder()
      expect(result.ordered).toBe(2)
    })

    it('getAutoOrderRules', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getAutoOrderRules()
      expect(result).toHaveLength(0)
    })

    it('getSupplierOrderStats', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ total: 5 }))
      const result = await api.getSupplierOrderStats()
      expect(result.total).toBe(5)
    })
  })

  // ── Modifiers ──
  describe('getModifiersForItem', () => {
    it('fetches modifiers', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getModifiersForItem(1)
      expect(result).toHaveLength(0)
    })
  })

  // ── Reservations ──
  describe('reservations', () => {
    it('getReservationTimeline', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getReservationTimeline()
      expect(result).toHaveLength(0)
    })

    it('getReservationCalendar', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getReservationCalendar()
      expect(result).toHaveLength(0)
    })

    it('getReservationTableAvailability', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getReservationTableAvailability()
      expect(result).toHaveLength(0)
    })
  })

  // ── Eracun ──
  describe('eracun', () => {
    it('eracunList', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.eracunList()
      expect(result).toHaveLength(0)
    })

    it('validateInvoiceEracun', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ valid: true }))
      const result = await api.validateInvoiceEracun(1)
      expect(result.valid).toBe(true)
    })

    it('getInvoiceStats', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ total: 100 }))
      const result = await api.getInvoiceStats()
      expect(result.total).toBe(100)
    })

    it('bulkSendEracun', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ sent: 5, results: [] }))
      const result = await api.bulkSendEracun([1, 2, 3, 4, 5])
      expect(result.sent).toBe(5)
    })

    it('bulkUpdateEracunStatus', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ updated: 3 }))
      const result = await api.bulkUpdateEracunStatus([1, 2, 3], 'sent')
      expect(result.updated).toBe(3)
    })

    it('createCreditNote', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1 }))
      const result = await api.createCreditNote(1)
      expect(result.id).toBe(1)
    })

    it('bulkDeleteInvoices', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ deleted: 2 }))
      const result = await api.bulkDeleteInvoices([1, 2])
      expect(result.deleted).toBe(2)
    })
  })

  // ── Schedule / Shifts ──
  describe('schedule', () => {
    it('getMySchedule', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getMySchedule()
      expect(result).toHaveLength(0)
    })

    it('bulkDeleteShifts', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ deleted: 2 }))
      const result = await api.bulkDeleteShifts([1, 2])
      expect(result.deleted).toBe(2)
    })

    it('bulkCloseShifts', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ closed: 3 }))
      const result = await api.bulkCloseShifts([1, 2, 3])
      expect(result.closed).toBe(3)
    })

    it('autoSchedule', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ scheduled: 10 }))
      const result = await api.autoSchedule()
      expect(result.scheduled).toBe(10)
    })

    it('breakStart', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.breakStart()
      expect(result.ok).toBe(true)
    })

    it('breakEnd', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.breakEnd()
      expect(result.ok).toBe(true)
    })
  })

  // ── Employees ──
  describe('employees', () => {
    it('getEmployeeDetail', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1, name: 'Test' }))
      const result = await api.getEmployeeDetail(1)
      expect(result.name).toBe('Test')
    })

    it('getEmployeeGoals', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getEmployeeGoals(1)
      expect(result).toHaveLength(0)
    })

    it('getEmployeePerformanceSummary', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ score: 85 }))
      const result = await api.getEmployeePerformanceSummary(1)
      expect(result.score).toBe(85)
    })
  })

  // ── Promos / Upsell ──
  describe('promos', () => {
    it('getSmartPromos', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getSmartPromos()
      expect(result).toHaveLength(0)
    })

    it('getUpsellSuggestions', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getUpsellSuggestions(1)
      expect(result).toHaveLength(0)
    })

    it('calculatePromotion', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ discount: 5.0 }))
      const result = await api.calculatePromotion([{ id: 1, price: 10 }], 50)
      expect(result.discount).toBe(5.0)
    })
  })

  // ── Alerts ──
  describe('alerts', () => {
    it('getActiveAlerts', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getActiveAlerts()
      expect(result).toHaveLength(0)
    })

    it('getAlertStatistics', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ total: 0 }))
      const result = await api.getAlertStatistics()
      expect(result.total).toBe(0)
    })
  })

  // ── Allergens ──
  describe('allergens', () => {
    it('getAllAllergens', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getAllAllergens()
      expect(result).toHaveLength(0)
    })

    it('getAllergenStats', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ total: 0 }))
      const result = await api.getAllergenStats()
      expect(result.total).toBe(0)
    })

    it('getItemAllergens', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getItemAllergens(1)
      expect(result).toHaveLength(0)
    })

    it('updateItemAllergens', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.updateItemAllergens(1, [1, 2])
      expect(result.ok).toBe(true)
    })

    it('searchAllergenFree', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.searchAllergenFree([1])
      expect(result).toHaveLength(0)
    })
  })

  // ── AI ──
  describe('ai', () => {
    it('getAISuggestions', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getAISuggestions()
      expect(result).toHaveLength(0)
    })

    it('getWeatherMenu', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ temp: 25, suggestions: [] }))
      const result = await api.getWeatherMenu()
      expect(result.temp).toBe(25)
    })
  })

  // ── Voice ──
  describe('voice', () => {
    it('getVoiceCommands', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getVoiceCommands()
      expect(result).toHaveLength(0)
    })

    it('parseVoiceOrder', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ items: [{ name: 'Pivo', qty: 2 }] }))
      const result = await api.parseVoiceOrder('Dve pivo')
      expect(result.items).toHaveLength(1)
    })

    it('voiceSearchMenu', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([{ id: 1, name: 'Pivo' }]))
      const result = await api.voiceSearchMenu('pivo')
      expect(result[0].name).toBe('Pivo')
    })
  })

  // ── Loyalty ──
  describe('loyalty', () => {
    it('getCustomerPoints', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ points: 150 }))
      const result = await api.getCustomerPoints(1)
      expect(result.points).toBe(150)
    })

    it('earnLoyaltyPoints', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ points: 160 }))
      const result = await api.earnLoyaltyPoints(1, 10)
      expect(result.points).toBe(160)
    })

    it('redeemLoyaltyPoints', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ points: 100 }))
      const result = await api.redeemLoyaltyPoints(1, 50)
      expect(result.points).toBe(100)
    })

    it('getLoyaltyLeaderboard', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getLoyaltyLeaderboard()
      expect(result).toHaveLength(0)
    })

    it('getLoyaltyRewards', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getLoyaltyRewards()
      expect(result).toHaveLength(0)
    })

    it('getBirthdayMembers', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getBirthdayMembers()
      expect(result).toHaveLength(0)
    })
  })

  // ── Swap requests ──
  describe('swap requests', () => {
    it('listSwapRequests', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.listSwapRequests()
      expect(result).toHaveLength(0)
    })

    it('getSwapRequests', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getSwapRequests()
      expect(result).toHaveLength(0)
    })

    it('getSwapAvailability', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getSwapAvailability()
      expect(result).toHaveLength(0)
    })

    it('createSwapRequest', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ id: 1 }))
      const result = await api.createSwapRequest({ shift_date: '2026-07-18', original_start: '08:00', original_end: '16:00' })
      expect(result.id).toBe(1)
    })

    it('cancelSwapRequest', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.cancelSwapRequest(1)
      expect(result.ok).toBe(true)
    })

    it('respondSwapRequest', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.respondSwapRequest(1, 'approved')
      expect(result.ok).toBe(true)
    })

    it('requestShiftSwap', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.requestShiftSwap(1, 2, 'Osebno')
      expect(result.ok).toBe(true)
    })

    it('approveShiftSwap', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.approveShiftSwap(1, true)
      expect(result.ok).toBe(true)
    })
  })

  // ── Notifications ──
  describe('notifications', () => {
    it('getNotifications', async () => {
      mockFetch.mockResolvedValueOnce(mockOk([]))
      const result = await api.getNotifications()
      expect(result).toHaveLength(0)
    })

    it('markNotificationRead', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.markNotificationRead(1)
      expect(result.ok).toBe(true)
    })

    it('markAllNotificationsRead', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ ok: true }))
      const result = await api.markAllNotificationsRead()
      expect(result.ok).toBe(true)
    })
  })

  // ── Backup / Queue ──
  describe('backup and queue', () => {
    it('syncOfflineQueue', async () => {
      const result = await api.syncOfflineQueue()
      expect(typeof result).toBe('number')
    })

    it('getOfflineQueueCount', async () => {
      const result = await api.getOfflineQueueCount()
      expect(typeof result).toBe('number')
    })
  })

  // ── checkPageAccess ──
  describe('checkPageAccess', () => {
    it('checks page access', async () => {
      mockFetch.mockResolvedValueOnce(mockOk({ allowed: true }))
      const result = await api.checkPageAccess('pos')
      expect(result.allowed).toBe(true)
    })
  })

  // ── Network / offline ──
  describe('network', () => {
    it('isOnline returns boolean', () => {
      expect(typeof api.isOnline()).toBe('boolean')
    })

    it('isNetworkError checks error', () => {
      expect(api.isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
      expect(api.isNetworkError(new Error('Other'))).toBe(false)
    })
  })

  // ── Error handling ──
  describe('error handling', () => {
    it('getDashboard throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(500))
      await expect(api.getDashboard()).rejects.toThrow()
    })

    it('getKdsOrders throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(500))
      await expect(api.getKdsOrders()).rejects.toThrow()
    })

    it('getHeldOrder throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockFail(404))
      await expect(api.getHeldOrder(999)).rejects.toThrow()
    })
  })
})
