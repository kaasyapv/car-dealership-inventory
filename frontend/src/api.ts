import type { Filters, Page, StockEvent, User, Vehicle, VehicleInput } from './types'

export const PAGE_SIZE = 12

export interface Session {
  token: string
  user: User
}

const SESSION_KEY = 'dealership.session'

export const loadSession = (): Session | null => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
  } catch {
    return null
  }
}
export const saveSession = (s: Session) => localStorage.setItem(SESSION_KEY, JSON.stringify(s))
export const clearSession = () => localStorage.removeItem(SESSION_KEY)

/** Thin fetch wrapper: adds the bearer token, parses JSON, and turns API errors into Error(message). */
async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<{ data: T; headers: Headers }> {
  const token = loadSession()?.token
  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  if (res.status === 204) return { data: undefined as T, headers: res.headers }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // An expired token on a protected route means the session is dead: force a fresh login.
    if (res.status === 401 && token) {
      clearSession()
      location.reload()
    }
    throw new Error(data.error ?? 'Something went wrong')
  }
  return { data: data as T, headers: res.headers }
}

const request = async <T>(path: string, init?: { method?: string; body?: unknown }) => (await call<T>(path, init)).data

export const login = (email: string, password: string) =>
  request<Session>('/auth/login', { method: 'POST', body: { email, password } })
export const register = (email: string, password: string) =>
  request<Session>('/auth/register', { method: 'POST', body: { email, password } })

/** One page of results; the total matching count (for "Load more") comes from the X-Total-Count header. */
export const searchVehicles = async (f: Filters, offset = 0): Promise<Page> => {
  const params = new URLSearchParams()
  for (const key of ['make', 'model', 'category', 'minPrice', 'maxPrice'] as const) {
    if (f[key].trim()) params.set(key, f[key].trim())
  }
  if (f.available) params.set('available', 'true')
  if (f.sort !== 'id') {
    const [sort, order] = f.sort.split(':')
    params.set('sort', sort)
    params.set('order', order)
  }
  params.set('limit', String(PAGE_SIZE))
  params.set('offset', String(offset))
  const { data, headers } = await call<Vehicle[]>(`/vehicles/search?${params}`)
  return { items: data, total: Number(headers.get('X-Total-Count') ?? data.length) }
}
export const createVehicle = (v: VehicleInput) => request<Vehicle>('/vehicles', { method: 'POST', body: v })
export const updateVehicle = (id: number, v: VehicleInput) =>
  request<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body: v })
export const deleteVehicle = (id: number) => request<void>(`/vehicles/${id}`, { method: 'DELETE' })
export const purchase = (id: number) => request<Vehicle>(`/vehicles/${id}/purchase`, { method: 'POST' })
export const restock = (id: number, amount: number) =>
  request<Vehicle>(`/vehicles/${id}/restock`, { method: 'POST', body: { amount } })
export const listEvents = (limit = 30) => request<StockEvent[]>(`/inventory/events?limit=${limit}`)
