import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'
import Dashboard from './Dashboard'
import type { User, Vehicle } from './types'

vi.mock('./api')

const civic: Vehicle = { id: 1, make: 'Honda', model: 'Civic', category: 'Sedan', price: 22000, quantity: 5 }
const f150: Vehicle = { id: 2, make: 'Ford', model: 'F-150', category: 'Truck', price: 45000, quantity: 0 }
const admin: User = { id: 1, email: 'admin@x.com', role: 'admin' }
const shopper: User = { id: 2, email: 'u@x.com', role: 'user' }

const show = (user: User) => render(<Dashboard user={user} onLogout={() => {}} />)
const cardOf = async (name: string) => (await screen.findByText(name)).closest('article')!

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.searchVehicles).mockResolvedValue([civic, f150])
})

describe('browsing', () => {
  it('shows the vehicles', async () => {
    show(shopper)
    expect(await screen.findByText('Honda Civic')).toBeInTheDocument()
    expect(screen.getByText('Ford F-150')).toBeInTheDocument()
  })

  it('searches with the filters when Search is pressed', async () => {
    show(shopper)
    await screen.findByText('Honda Civic')
    await userEvent.type(screen.getByLabelText('Filter by make'), 'ford')
    await userEvent.click(screen.getByLabelText('In stock only'))
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(api.searchVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ make: 'ford', available: true }))
  })

  it('clears the filters', async () => {
    show(shopper)
    await screen.findByText('Honda Civic')
    await userEvent.type(screen.getByLabelText('Filter by make'), 'ford')
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByLabelText('Filter by make')).toHaveValue('')
    expect(api.searchVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ make: '' }))
  })

  it('shows a message when nothing matches', async () => {
    vi.mocked(api.searchVehicles).mockResolvedValue([])
    show(shopper)
    expect(await screen.findByText(/no vehicles match/i)).toBeInTheDocument()
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
  it('purchases, then shows the new stock and a message', async () => {
    vi.mocked(api.purchase).mockResolvedValue({ ...civic, quantity: 4 })
    vi.mocked(api.searchVehicles).mockResolvedValueOnce([civic, f150]).mockResolvedValue([{ ...civic, quantity: 4 }, f150])
    show(shopper)
    const card = await cardOf('Honda Civic')
    await userEvent.click(within(card).getByRole('button', { name: 'Purchase' }))
    expect(api.purchase).toHaveBeenCalledWith(1)
    expect(await screen.findByText('4 in stock')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Purchased Honda Civic')
  })

  it('shows API errors', async () => {
    vi.mocked(api.purchase).mockRejectedValue(new Error('Vehicle is out of stock'))
    show(shopper)
    await userEvent.click(within(await cardOf('Honda Civic')).getByRole('button', { name: 'Purchase' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Vehicle is out of stock')
  })

  it('hides admin tools from regular users', async () => {
    show(shopper)
    await screen.findByText('Honda Civic')
    expect(screen.queryByRole('button', { name: 'Add vehicle' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })
})

describe('admin tools', () => {
  it('adds a vehicle', async () => {
    vi.mocked(api.createVehicle).mockResolvedValue({ id: 3, make: 'Tesla', model: 'Model 3', category: 'Sedan', price: 40000, quantity: 4 })
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
  })

  it('keeps the form open and shows the reason when saving fails', async () => {
    vi.mocked(api.updateVehicle).mockRejectedValue(new Error('Invalid input'))
    show(admin)
    await userEvent.click(within(await cardOf('Honda Civic')).getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Invalid input')
  })

  it('deletes after the admin confirms', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(api.deleteVehicle).mockResolvedValue(undefined)
    show(admin)
    await userEvent.click(within(await cardOf('Honda Civic')).getByRole('button', { name: 'Delete' }))
    expect(api.deleteVehicle).toHaveBeenCalledWith(1)
  })

  it('does not delete when the admin cancels', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    show(admin)
    await userEvent.click(within(await cardOf('Honda Civic')).getByRole('button', { name: 'Delete' }))
    expect(api.deleteVehicle).not.toHaveBeenCalled()
  })

  it('restocks by 5', async () => {
    vi.mocked(api.restock).mockResolvedValue({ ...civic, quantity: 10 })
    show(admin)
    await userEvent.click(within(await cardOf('Honda Civic')).getByRole('button', { name: 'Restock +5' }))
    expect(api.restock).toHaveBeenCalledWith(1, 5)
  })
})
