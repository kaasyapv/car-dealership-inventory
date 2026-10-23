import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'
import Dashboard from './Dashboard'
import type { StockEvent, User, Vehicle } from './types'

vi.mock('./api')

const civic: Vehicle = { id: 1, make: 'Honda', model: 'Civic', category: 'Sedan', price: 22000, quantity: 5 }
const f150: Vehicle = { id: 2, make: 'Ford', model: 'F-150', category: 'Truck', price: 45000, quantity: 0 }
const admin: User = { id: 1, email: 'admin@x.com', role: 'admin' }
const shopper: User = { id: 2, email: 'u@x.com', role: 'user' }

const show = (user: User) => render(<Dashboard user={user} onLogout={() => {}} />)
const cardOf = async (name: string) => (await screen.findByText(name)).closest('article')!

beforeEach(() => {
  vi.resetAllMocks()
  window.history.replaceState(null, '', '/')
  vi.mocked(api.searchVehicles).mockResolvedValue({ items: [civic, f150], total: 2 })
})

describe('browsing', () => {
  it('shows loading placeholders, then the vehicles', async () => {
    show(shopper)
    expect(screen.getByLabelText('Loading vehicles')).toBeInTheDocument()
    expect(await screen.findByText('Honda Civic')).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading vehicles')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 2 of 2 vehicles')).toBeInTheDocument()
  })

  it('debounces typing into a single search', async () => {
    show(shopper)
    await screen.findByText('Honda Civic')
    vi.mocked(api.searchVehicles).mockClear()
    await userEvent.type(screen.getByLabelText('Filter by make'), 'ford')
    await waitFor(() =>
      expect(api.searchVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ make: 'ford' }), 0),
    )
    expect(api.searchVehicles).toHaveBeenCalledTimes(1)
  })

  it('can hide sold-out vehicles', async () => {
    show(shopper)
    await screen.findByText('Honda Civic')
    await userEvent.click(screen.getByLabelText('In stock only'))
    await waitFor(() =>
      expect(api.searchVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ available: true }), 0),
    )
  })

  it('can sort by price', async () => {
    show(shopper)
    await screen.findByText('Honda Civic')
    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'price:asc')
    await waitFor(() =>
      expect(api.searchVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'price:asc' }), 0),
    )
  })

  it('starts from filters in the URL and keeps the URL in sync', async () => {
    window.history.replaceState(null, '', '/?make=ford')
    show(shopper)
    await screen.findByText('Honda Civic')
    expect(api.searchVehicles).toHaveBeenCalledWith(expect.objectContaining({ make: 'ford' }), 0)
    expect(screen.getByLabelText('Filter by make')).toHaveValue('ford')
    await userEvent.type(screen.getByLabelText('Filter by model'), 'f')
    await waitFor(() => expect(window.location.search).toBe('?make=ford&model=f'))
  })

  it('shows an empty state when nothing matches', async () => {
    vi.mocked(api.searchVehicles).mockResolvedValue({ items: [], total: 0 })
    show(shopper)
    expect(await screen.findByText(/no vehicles match/i)).toBeInTheDocument()
  })

  it('loads the next page and appends it', async () => {
    const third: Vehicle = { id: 3, make: 'Audi', model: 'A4', category: 'Sedan', price: 40000, quantity: 2 }
    vi.mocked(api.searchVehicles)
      .mockResolvedValueOnce({ items: [civic, f150], total: 3 })
      .mockResolvedValueOnce({ items: [third], total: 3 })
    show(shopper)
    await screen.findByText('Honda Civic')
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(await screen.findByText('Audi A4')).toBeInTheDocument()
    expect(api.searchVehicles).toHaveBeenLastCalledWith(expect.anything(), 2)
    expect(screen.getByText('Honda Civic')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('reports a failed search with a retry that works', async () => {
    vi.mocked(api.searchVehicles).mockRejectedValueOnce(new Error('Network down'))
    show(shopper)
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Honda Civic')).toBeInTheDocument()
  })
})

describe('buying', () => {
  it('purchases, shows the new stock and confirms with a toast', async () => {
    vi.mocked(api.purchase).mockResolvedValue({ ...civic, quantity: 4 })
    show(shopper)
    const card = await cardOf('Honda Civic')
    await userEvent.click(within(card).getByRole('button', { name: 'Purchase' }))
    expect(api.purchase).toHaveBeenCalledWith(1)
    expect(await within(card).findByText('Only 4 left')).toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('Purchased Honda Civic')
  })

  it('shows API errors in a toast', async () => {
    vi.mocked(api.purchase).mockRejectedValue(new Error('Vehicle is out of stock'))
    show(shopper)
    await userEvent.click(within(await cardOf('Honda Civic')).getByRole('button', { name: 'Purchase' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Vehicle is out of stock')
  })

  it('hides admin tools from regular users', async () => {
    show(shopper)
    await screen.findByText('Honda Civic')
    expect(screen.queryByRole('button', { name: 'Add vehicle' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Activity' })).not.toBeInTheDocument()
  })
})

describe('admin tools', () => {
  it('adds a vehicle', async () => {
    const created = { id: 3, make: 'Tesla', model: 'Model 3', category: 'Sedan', price: 40000, quantity: 4 }
    vi.mocked(api.createVehicle).mockResolvedValue(created)
    show(admin)
    await screen.findByText('Honda Civic')
    await userEvent.click(screen.getByRole('button', { name: 'Add vehicle' }))
    await userEvent.type(screen.getByLabelText('Make'), 'Tesla')
    await userEvent.type(screen.getByLabelText('Model'), 'Model 3')
    await userEvent.type(screen.getByLabelText('Category'), 'Sedan')
    await userEvent.type(screen.getByLabelText('Price'), '40000')
    await userEvent.type(screen.getByLabelText('Quantity'), '4')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(api.createVehicle).toHaveBeenCalledWith({
      make: 'Tesla', model: 'Model 3', category: 'Sedan', price: 40000, quantity: 4,
    })
    expect(await screen.findByText('Tesla Model 3')).toBeInTheDocument()
  })

  it('focuses the first field of the form and closes it with Escape', async () => {
    show(admin)
    await screen.findByText('Honda Civic')
    await userEvent.click(screen.getByRole('button', { name: 'Add vehicle' }))
    expect(screen.getByLabelText('Make')).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('edits a vehicle', async () => {
    vi.mocked(api.updateVehicle).mockResolvedValue({ ...civic, price: 21000 })
    show(admin)
    await userEvent.click(within(await cardOf('Honda Civic')).getByRole('button', { name: 'Edit' }))
    const price = screen.getByLabelText('Price')
    await userEvent.clear(price)
    await userEvent.type(price, '21000')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(api.updateVehicle).toHaveBeenCalledWith(1, expect.objectContaining({ price: 21000 }))
    expect(await screen.findByText('$21,000')).toBeInTheDocument()
  })

  it('keeps the form open and shows the reason when saving fails', async () => {
    vi.mocked(api.updateVehicle).mockRejectedValue(new Error('Validation failed'))
    show(admin)
    await userEvent.click(within(await cardOf('Honda Civic')).getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Validation failed')
  })

  it('deletes only after an in-app confirmation', async () => {
    vi.mocked(api.deleteVehicle).mockResolvedValue(undefined)
    show(admin)
    await userEvent.click(within(await cardOf('Honda Civic')).getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Delete Honda Civic?')
    expect(api.deleteVehicle).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(api.deleteVehicle).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.queryByText('Honda Civic')).not.toBeInTheDocument())
  })

  it('does not delete when the admin cancels', async () => {
    show(admin)
    await userEvent.click(within(await cardOf('Honda Civic')).getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(api.deleteVehicle).not.toHaveBeenCalled()
    expect(screen.getByText('Honda Civic')).toBeInTheDocument()
  })

  it('restocks', async () => {
    vi.mocked(api.restock).mockResolvedValue({ ...civic, quantity: 10 })
    show(admin)
    const card = await cardOf('Honda Civic')
    await userEvent.click(within(card).getByRole('button', { name: 'Restock +5' }))
    expect(api.restock).toHaveBeenCalledWith(1, 5)
    expect(await within(card).findByText('10 in stock')).toBeInTheDocument()
  })

  it('shows the recent sales and restocks', async () => {
    const events: StockEvent[] = [
      { id: 2, vehicleId: 1, vehicle: 'Honda Civic', userEmail: 'u@x.com', kind: 'purchase', quantity: 1, at: '2026-10-01T10:00:00.000Z' },
      { id: 1, vehicleId: 1, vehicle: 'Honda Civic', userEmail: 'admin@x.com', kind: 'restock', quantity: 5, at: '2026-10-01T09:00:00.000Z' },
    ]
    vi.mocked(api.listEvents).mockResolvedValue(events)
    show(admin)
    await screen.findByText('Honda Civic')
    await userEvent.click(screen.getByRole('button', { name: 'Activity' }))
    const panel = await screen.findByRole('dialog', { name: 'Recent activity' })
    expect(await within(panel).findByText(/u@x.com bought 1 × Honda Civic/)).toBeInTheDocument()
    expect(within(panel).getByText(/admin@x.com restocked 5 × Honda Civic/)).toBeInTheDocument()
  })
})
