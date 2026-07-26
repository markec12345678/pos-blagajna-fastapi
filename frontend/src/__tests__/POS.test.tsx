import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import POS from '../POS'

vi.mock('../api', () => ({
  getMenu: vi.fn().mockResolvedValue([]),
  getTables: vi.fn().mockResolvedValue([]),
  getCourses: vi.fn().mockResolvedValue([]),
  getModifiersForItem: vi.fn().mockResolvedValue([]),
  authHeader: vi.fn().mockReturnValue({}),
  calculatePromotion: vi.fn().mockResolvedValue(null),
}))

vi.mock('../useWebSocket', () => ({
  useWebSocket: vi.fn(() => {}),
}))

vi.mock('../useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(() => {}),
}))

vi.mock('../PrintService', () => ({
  printReceipt: vi.fn(),
  printKitchenOrder: vi.fn(),
}))

vi.mock('../AIPanels', () => ({
  AISearchPanel: () => <div data-testid="ai-search" />,
  AIComboPanel: () => <div data-testid="ai-combo" />,
}))

vi.mock('../PromptDialog', () => ({
  PromptDialog: () => <div data-testid="prompt-dialog" />,
}))

vi.mock('../PaymentDialog', () => ({
  default: () => <div data-testid="payment-dialog" />,
}))

vi.mock('../fuzzySearch', () => ({
  fuzzySearch: vi.fn().mockReturnValue([]),
}))

describe('POS Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<POS onNotify={vi.fn()} />)
    expect(document.body).toBeTruthy()
  })

  it('shows table selection area', () => {
    render(<POS onNotify={vi.fn()} />)
    expect(screen.getByText(/Miza|Table/i)).toBeInTheDocument()
  })

  it('shows order type buttons', () => {
    render(<POS onNotify={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
