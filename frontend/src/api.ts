import type { Filters, User, Vehicle, VehicleInput } from './types'

export type Session = { token: string; user: User }

// SESSION: the login token is kept in the browser's localStorage
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

// REQUEST HELPER: every call to the backend goes through here and sends the token
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = loadSession()?.token
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token) {
      clearSession()
      location.reload()
    }
    throw new Error(data.error ?? 'Something went wrong')
  }
  return data as T
}

export const login = (email: string, password: string) => request<Session>('/auth/login', 'POST', { email, password })
export const register = (email: string, password: string) => request<Session>('/auth/register', 'POST', { email, password })

// SEARCH: only the filters that are filled in are sent
export function searchVehicles(filters: Filters) {
  const params = new URLSearchParams()
  for (const key of ['make', 'model', 'category', 'minPrice', 'maxPrice'] as const) {
    if (filters[key].trim()) params.set(key, filters[key].trim())
  }
  if (filters.available) params.set('available', 'true')
  return request<Vehicle[]>(`/vehicles/search?${params}`)
}

export const createVehicle = (v: VehicleInput) => request<Vehicle>('/vehicles', 'POST', v)
export const updateVehicle = (id: number, v: VehicleInput) => request<Vehicle>(`/vehicles/${id}`, 'PUT', v)
export const deleteVehicle = (id: number) => request<void>(`/vehicles/${id}`, 'DELETE')
export const purchase = (id: number) => request<Vehicle>(`/vehicles/${id}/purchase`, 'POST')
export const restock = (id: number, amount: number) => request<Vehicle>(`/vehicles/${id}/restock`, 'POST', { amount })
