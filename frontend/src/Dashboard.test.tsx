import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'
import Dashboard from './Dashboard'
import type { User, Vehicle } from './types'

vi.mock('./api')

const civic: Vehicle = { id: 1, make: 'Honda', model: 'Civic', category: 'Sedan', price: 22000, quantity: 3 }
const f150: Vehicle = { id: 2, make: 'Ford', model: 'F-150', category: 'Truck', price: 45000, quantity: 0 }
const admin: User = { id: 1, email: 'admin@x.com', role: 'admin' }
const shopper: User = { id: 2, email: 'u@x.com', role: 'user' }

const show = (user: User) => render(<Dashboard user={user} onLogout={() => {}} />)

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.searchVehicles).mockResolvedValue([civic, f150])
})

describe('Dashboard', () => {
  it('lists the vehicles from the API', async () => {
    show(shopper)
    expect(await screen.findByText('Honda Civic')).toBeInTheDocument()
    expect(screen.getByText('Ford F-150')).toBeInTheDocument()
  })

  it('searches by make as the user types', async () => {
    show(shopper)
    await screen.findByText('Honda Civic')
    await userEvent.type(screen.getByLabelText('Filter by make'), 'ford')
    await waitFor(() =>
      expect(api.searchVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ make: 'ford' })),
    )
  })

  it('shows an empty state when nothing matches', async () => {
    vi.mocked(api.searchVehicles).mockResolvedValue([])
    show(shopper)
    expect(await screen.findByText(/no vehicles match/i)).toBeInTheDocument()
  })

  it('purchases a vehicle and shows the new stock', async () => {
    vi.mocked(api.purchase).mockResolvedValue({ ...civic, quantity: 2 })
    show(shopper)
    const card = (await screen.findByText('Honda Civic')).closest('article')!
    await userEvent.click(within(card).getByRole('button', { name: 'Purchase' }))
    expect(api.purchase).toHaveBeenCalledWith(1)
    expect(await within(card).findByText('2 in stock')).toBeInTheDocument()
  })

  it('shows API errors to the user', async () => {
    vi.mocked(api.purchase).mockRejectedValue(new Error('Vehicle is out of stock'))
    show(shopper)
    const card = (await screen.findByText('Honda Civic')).closest('article')!
    await userEvent.click(within(card).getByRole('button', { name: 'Purchase' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Vehicle is out of stock')
  })

  it('hides admin tools from regular users', async () => {
    show(shopper)
    await screen.findByText('Honda Civic')
    expect(screen.queryByRole('button', { name: 'Add vehicle' })).not.toBeInTheDocument()
  })

  it('lets an admin add a vehicle', async () => {
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

  it('lets an admin edit a vehicle', async () => {
    vi.mocked(api.updateVehicle).mockResolvedValue({ ...civic, price: 21000 })
    show(admin)
    const card = (await screen.findByText('Honda Civic')).closest('article')!
    await userEvent.click(within(card).getByRole('button', { name: 'Edit' }))
    const price = screen.getByLabelText('Price')
    await userEvent.clear(price)
    await userEvent.type(price, '21000')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(api.updateVehicle).toHaveBeenCalledWith(1, expect.objectContaining({ price: 21000 }))
    expect(await screen.findByText('$21,000')).toBeInTheDocument()
  })

  it('lets an admin delete a vehicle after confirming', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(api.deleteVehicle).mockResolvedValue(undefined)
    show(admin)
    const card = (await screen.findByText('Honda Civic')).closest('article')!
    await userEvent.click(within(card).getByRole('button', { name: 'Delete' }))
    expect(api.deleteVehicle).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.queryByText('Honda Civic')).not.toBeInTheDocument())
  })

  it('does not delete when the admin cancels', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    show(admin)
    const card = (await screen.findByText('Honda Civic')).closest('article')!
    await userEvent.click(within(card).getByRole('button', { name: 'Delete' }))
    expect(api.deleteVehicle).not.toHaveBeenCalled()
  })

  it('lets an admin restock', async () => {
    vi.mocked(api.restock).mockResolvedValue({ ...civic, quantity: 8 })
    show(admin)
    const card = (await screen.findByText('Honda Civic')).closest('article')!
    await userEvent.click(within(card).getByRole('button', { name: 'Restock +5' }))
    expect(api.restock).toHaveBeenCalledWith(1, 5)
    expect(await within(card).findByText('8 in stock')).toBeInTheDocument()
  })
})
