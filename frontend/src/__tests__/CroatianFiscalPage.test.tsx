import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CroatianFiscalPage from '../CroatianFiscalPage'

vi.mock('../api', () => ({
  getFiscalStatus: vi.fn().mockResolvedValue({}),
  fiscalizeCroatian: vi.fn().mockResolvedValue({}),
  getInvoices: vi.fn().mockResolvedValue([]),
  authHeader: vi.fn().mockReturnValue({}),
}))

describe('CroatianFiscalPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders without crashing', () => {
    render(<CroatianFiscalPage onNotify={vi.fn()} />)
    expect(document.body).toBeTruthy()
  })

  it('shows page heading', () => {
    render(<CroatianFiscalPage onNotify={vi.fn()} />)
    const headings = screen.getAllByText(/Hrvašk|Croatian|Fiskal/i)
    expect(headings.length).toBeGreaterThan(0)
  })
})
