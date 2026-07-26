import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PaymentDialog from '../PaymentDialog'

vi.mock('../api', () => ({
  authHeader: vi.fn().mockReturnValue({ 'Authorization': 'Bearer test' }),
}))

describe('PaymentDialog', () => {
  const defaultProps = {
    total: 25.50,
    onPay: vi.fn(),
    onClose: vi.fn(),
    customer: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }))
  })

  it('renders title', () => {
    render(<PaymentDialog {...defaultProps} />)
    expect(screen.getByText('Plačilo')).toBeInTheDocument()
  })

  it('shows tip buttons', () => {
    render(<PaymentDialog {...defaultProps} />)
    expect(screen.getByText('Brez')).toBeInTheDocument()
    expect(screen.getByText(/15%/)).toBeInTheDocument()
    expect(screen.getByText(/20%/)).toBeInTheDocument()
  })

  it('shows payment methods', () => {
    render(<PaymentDialog {...defaultProps} />)
    expect(screen.getByText(/Gotovina/)).toBeInTheDocument()
    expect(screen.getByText(/Kartica/)).toBeInTheDocument()
  })

  it('calls onClose when Nazaj clicked', () => {
    render(<PaymentDialog {...defaultProps} />)
    fireEvent.click(screen.getByText('Nazaj'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onPay with cash when Gotovina clicked', () => {
    render(<PaymentDialog {...defaultProps} />)
    fireEvent.click(screen.getByText(/Gotovina/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('cash', 0, 25.5)
  })

  it('calls onPay with card when Kartica clicked', () => {
    render(<PaymentDialog {...defaultProps} />)
    fireEvent.click(screen.getByText(/Kartica/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('card', 0, 25.5)
  })

  it('selects 5% tip', () => {
    render(<PaymentDialog {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    const tip5 = buttons.find(b => /^5%/.test(b.textContent || ''))
    fireEvent.click(tip5!)
    fireEvent.click(screen.getByText(/Gotovina/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('cash', 1.275, 25.5)
  })

  it('selects 10% tip', () => {
    render(<PaymentDialog {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    const tip10 = buttons.find(b => /^10%/.test(b.textContent || ''))
    fireEvent.click(tip10!)
    fireEvent.click(screen.getByText(/Gotovina/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('cash', 2.55, 25.5)
  })

  it('custom tip via Drugo button', () => {
    render(<PaymentDialog {...defaultProps} />)
    fireEvent.click(screen.getByText('Drugo'))
    const input = screen.getByPlaceholderText('Znesek napitnine...')
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.click(screen.getByText(/Gotovina/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('cash', 3, 25.5)
  })

  it('shows loyalty section for member with enough points', () => {
    const customer = { id: 1, name: 'Janez', loyalty_points: 200, is_member: true }
    render(<PaymentDialog {...defaultProps} customer={customer} />)
    expect(screen.getByText(/Zvestoba/)).toBeInTheDocument()
    expect(screen.getByText(/Unovči točke/)).toBeInTheDocument()
  })

  it('does not show loyalty for non-member', () => {
    const customer = { id: 1, name: 'Janez', loyalty_points: 200, is_member: false }
    render(<PaymentDialog {...defaultProps} customer={customer} />)
    expect(screen.queryByText(/Unovči točke/)).not.toBeInTheDocument()
  })

  it('does not show loyalty for member with <100 points', () => {
    const customer = { id: 1, name: 'Janez', loyalty_points: 50, is_member: true }
    render(<PaymentDialog {...defaultProps} customer={customer} />)
    expect(screen.queryByText(/Unovči točke/)).not.toBeInTheDocument()
  })

  it('shows gift card input', () => {
    render(<PaymentDialog {...defaultProps} />)
    expect(screen.getByText(/Darilna kartica/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Koda kartice...')).toBeInTheDocument()
  })

  it('switches tip back from custom to percentage', () => {
    render(<PaymentDialog {...defaultProps} />)
    fireEvent.click(screen.getByText('Drugo'))
    fireEvent.click(screen.getByText('Brez'))
    fireEvent.click(screen.getByText(/Gotovina/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('cash', 0, 25.5)
  })

  it('shows Terminal and Mobilno buttons', () => {
    render(<PaymentDialog {...defaultProps} />)
    expect(screen.getByText(/Terminal/)).toBeInTheDocument()
    expect(screen.getByText(/Mobilno/)).toBeInTheDocument()
  })

  it('calls onPay with terminal', () => {
    render(<PaymentDialog {...defaultProps} />)
    fireEvent.click(screen.getByText(/Terminal/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('terminal', 0, 25.5)
  })

  it('calls onPay with mobile', () => {
    render(<PaymentDialog {...defaultProps} />)
    fireEvent.click(screen.getByText(/Mobilno/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('mobile', 0, 25.5)
  })

  it('handles zero total', () => {
    render(<PaymentDialog {...defaultProps} total={0} />)
    expect(screen.getByText('Plačilo')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Gotovina/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('cash', 0, 0)
  })

  it('lookup gift card triggers fetch', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ active: true, balance: 50 }),
    })
    render(<PaymentDialog {...defaultProps} />)
    const input = screen.getByPlaceholderText('Koda kartice...')
    fireEvent.change(input, { target: { value: 'GC1234' } })
    fireEvent.click(screen.getByText('Preveri'))
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/gift-cards/code/GC1234',
        expect.objectContaining({ headers: expect.any(Object) })
      )
    })
  })

  it('short gift card code does not trigger fetch', () => {
    render(<PaymentDialog {...defaultProps} />)
    const input = screen.getByPlaceholderText('Koda kartice...')
    fireEvent.change(input, { target: { value: 'GC' } })
    fireEvent.click(screen.getByText('Preveri'))
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('gift-cards'),
      expect.anything()
    )
  })

  it('shows loyalty points max info when toggled', () => {
    const customer = { id: 1, name: 'Janez', loyalty_points: 500, is_member: true }
    render(<PaymentDialog {...defaultProps} customer={customer} />)
    fireEvent.click(screen.getByText(/Unovči točke/))
    expect(screen.getByText(/max.*točk/)).toBeInTheDocument()
  })

  it('selects 15% tip', () => {
    render(<PaymentDialog {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    const tip15 = buttons.find(b => /^15%/.test(b.textContent || ''))
    fireEvent.click(tip15!)
    fireEvent.click(screen.getByText(/Gotovina/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('cash', 3.825, 25.5)
  })

  it('selects 20% tip', () => {
    render(<PaymentDialog {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    const tip20 = buttons.find(b => /^20%/.test(b.textContent || ''))
    fireEvent.click(tip20!)
    fireEvent.click(screen.getByText(/Gotovina/))
    expect(defaultProps.onPay).toHaveBeenCalledWith('cash', 5.1, 25.5)
  })
})
