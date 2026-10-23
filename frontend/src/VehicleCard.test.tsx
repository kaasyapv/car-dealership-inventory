import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Vehicle } from './types'
import VehicleCard from './VehicleCard'

const civic: Vehicle = { id: 1, make: 'Honda', model: 'Civic', category: 'Sedan', price: 22000, quantity: 3 }
const noop = () => {}
const setup = (v: Vehicle, isAdmin = false, handlers = {}) =>
  render(<VehicleCard vehicle={v} isAdmin={isAdmin} onPurchase={noop} onRestock={noop} onEdit={noop} onDelete={noop} {...handlers} />)

describe('VehicleCard', () => {
  it('shows the vehicle details', () => {
    setup(civic)
    expect(screen.getByText('Honda Civic')).toBeInTheDocument()
    expect(screen.getByText('Sedan')).toBeInTheDocument()
    expect(screen.getByText('$22,000')).toBeInTheDocument()
    expect(screen.getByText('3 in stock')).toBeInTheDocument()
  })

  it('calls onPurchase when Purchase is clicked', async () => {
    const onPurchase = vi.fn()
    setup(civic, false, { onPurchase })
    await userEvent.click(screen.getByRole('button', { name: 'Purchase' }))
    expect(onPurchase).toHaveBeenCalledWith(civic)
  })

  it('disables Purchase and says sold out when quantity is zero', () => {
    setup({ ...civic, quantity: 0 })
    expect(screen.getByRole('button', { name: 'Purchase' })).toBeDisabled()
    expect(screen.getByText('Sold out')).toBeInTheDocument()
  })

  it('hides admin controls from regular users', () => {
    setup(civic)
    for (const name of ['Edit', 'Delete', 'Restock +5']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('gives admins edit, delete and restock', async () => {
    const [onEdit, onDelete, onRestock] = [vi.fn(), vi.fn(), vi.fn()]
    setup(civic, true, { onEdit, onDelete, onRestock })
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Restock +5' }))
    expect(onEdit).toHaveBeenCalledWith(civic)
    expect(onDelete).toHaveBeenCalledWith(civic)
    expect(onRestock).toHaveBeenCalledWith(civic)
  })
})
