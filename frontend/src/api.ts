import type { Filters, User, Vehicle, VehicleInput } from './types'

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
async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = loadSession()?.token
  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // An expired token on a protected route means the session is dead: force a fresh login.
    if (res.status === 401 && token) {
      clearSession()
      location.reload()
    }
    throw new Error(data.error ?? 'Something went wrong')
  }
  return data as T
}

export const login = (email: string, password: string) =>
  request<Session>('/auth/login', { method: 'POST', body: { email, password } })
export const register = (email: string, password: string) =>
  request<Session>('/auth/register', { method: 'POST', body: { email, password } })

export const searchVehicles = (filters: Filters) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value.trim()) params.set(key, value.trim())
  return request<Vehicle[]>(`/vehicles/search?${params}`)
}
export const createVehicle = (v: VehicleInput) => request<Vehicle>('/vehicles', { method: 'POST', body: v })
export const updateVehicle = (id: number, v: VehicleInput) =>
  request<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body: v })
export const deleteVehicle = (id: number) => request<void>(`/vehicles/${id}`, { method: 'DELETE' })
export const purchase = (id: number) => request<Vehicle>(`/vehicles/${id}/purchase`, { method: 'POST' })
export const restock = (id: number, amount: number) =>
  request<Vehicle>(`/vehicles/${id}/restock`, { method: 'POST', body: { amount } })
