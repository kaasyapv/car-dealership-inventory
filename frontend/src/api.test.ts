import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'

const fetchMock = vi.fn()
const reply = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  fetchMock.mockResolvedValue({ status, ok: status < 400, json: async () => body, headers: new Headers(headers) })

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  localStorage.clear()
})
afterEach(() => vi.unstubAllGlobals())

describe('api', () => {
  const base = { make: '', model: '', category: '', minPrice: '', maxPrice: '', available: false, sort: 'id' as const }

  it('builds the search query from non-empty filters only', async () => {
    reply(200, [])
    await api.searchVehicles({ ...base, make: ' honda ', minPrice: '100' })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/vehicles/search?make=honda&minPrice=100&limit=12&offset=0')
  })

  it('maps availability, sort and paging onto API parameters', async () => {
    reply(200, [])
    await api.searchVehicles({ ...base, available: true, sort: 'price:desc' }, 24)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/vehicles/search?available=true&sort=price&order=desc&limit=12&offset=24')
  })

  it('returns the items together with the total from X-Total-Count', async () => {
    reply(200, [{ id: 1 }], { 'X-Total-Count': '37' })
    expect(await api.searchVehicles(base)).toEqual({ items: [{ id: 1 }], total: 37 })
  })

  it('lists stock events for admins', async () => {
    reply(200, [])
    await api.listEvents()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/inventory/events?limit=30')
  })

  it('sends the saved bearer token', async () => {
    api.saveSession({ token: 'abc', user: { id: 1, email: 'a@x.com', role: 'user' } })
    reply(200, {})
    await api.purchase(7)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/vehicles/7/purchase')
  })

  it('throws the server error message', async () => {
    reply(409, { error: 'Vehicle is out of stock' })
    await expect(api.purchase(1)).rejects.toThrow('Vehicle is out of stock')
  })

  it('handles 204 No Content', async () => {
    reply(204)
    await expect(api.deleteVehicle(1)).resolves.toBeUndefined()
  })

  it('clears the session and reloads on an expired token', async () => {
    api.saveSession({ token: 'old', user: { id: 1, email: 'a@x.com', role: 'user' } })
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    reply(401, { error: 'Invalid or expired token' })
    await expect(api.purchase(1)).rejects.toThrow()
    expect(api.loadSession()).toBeNull()
    expect(reload).toHaveBeenCalled()
  })

  it('loadSession tolerates corrupt storage', () => {
    localStorage.setItem('dealership.session', '{nope')
    expect(api.loadSession()).toBeNull()
  })
})
