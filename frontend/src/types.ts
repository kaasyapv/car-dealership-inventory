export type Role = 'admin' | 'user'
export interface User {
  id: number
  email: string
  role: Role
}
export interface Vehicle {
  id: number
  make: string
  model: string
  category: string
  price: number
  quantity: number
}
export type VehicleInput = Omit<Vehicle, 'id'>
export type SortKey = 'id' | 'price:asc' | 'price:desc' | 'make:asc'
export interface Filters {
  make: string
  model: string
  category: string
  minPrice: string
  maxPrice: string
  available: boolean
  sort: SortKey
}
export interface Page {
  items: Vehicle[]
  total: number
}
export interface StockEvent {
  id: number
  vehicleId: number | null
  vehicle: string
  userEmail: string
  kind: 'purchase' | 'restock'
  quantity: number
  at: string
}
