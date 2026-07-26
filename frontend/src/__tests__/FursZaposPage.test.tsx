import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import FursZaposPage from '../FursZaposPage'

vi.mock('../api', () => ({
  getFiscalStatus: vi.fn().mockResolvedValue({}),
  fiscalizeFursZapos: vi.fn().mockResolvedValue({}),
  getInvoices: vi.fn().mockResolvedValue([]),
  authHeader: vi.fn().mockReturnValue({}),
}))

describe('FursZaposPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders without crashing', () => {
    render(<FursZaposPage />)
    expect(document.body).toBeTruthy()
  })

  it('shows page heading', () => {
    render(<FursZaposPage />)
    const headings = screen.getAllByText(/FURS|ZAPOS|Fiskal/i)
    expect(headings.length).toBeGreaterThan(0)
  })
})
