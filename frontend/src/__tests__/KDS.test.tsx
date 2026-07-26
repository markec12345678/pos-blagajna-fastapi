import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import KDS from '../KDS'

vi.mock('../api', () => ({
  getKdsOrders: vi.fn().mockResolvedValue([]),
  updateKdsItem: vi.fn().mockResolvedValue({}),
  startKDSTimer: vi.fn().mockResolvedValue({}),
  completeKDSTimer: vi.fn().mockResolvedValue({}),
  authHeader: vi.fn().mockReturnValue({}),
}))

vi.mock('../useWebSocket', () => ({
  useWebSocket: vi.fn(() => {}),
}))

vi.mock('../useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(() => {}),
}))

vi.mock('../PrintService', () => ({
  printKitchenOrder: vi.fn(),
}))

vi.mock('../notifications', () => ({
  requestNotificationPermission: vi.fn(),
  notifyNewOrder: vi.fn(),
  isPushSupported: vi.fn().mockReturnValue(false),
}))

describe('KDS Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ kds_refresh_interval: '5' }),
    }))
  })

  it('renders without crashing', () => {
    render(<KDS onNotify={vi.fn()} />)
    expect(document.body).toBeTruthy()
  })

  it('shows loading state initially', () => {
    render(<KDS onNotify={vi.fn()} />)
    const loadingEl = document.querySelector('.loading, [class*="spinner"], [class*="load"]')
    expect(loadingEl || screen.getByText(/Nalaganje|Loading/i)).toBeTruthy()
  })
})
