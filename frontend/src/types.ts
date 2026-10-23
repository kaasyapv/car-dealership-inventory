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
export interface Filters {
  q: string
  category: string
  minPrice: string
  maxPrice: string
}
