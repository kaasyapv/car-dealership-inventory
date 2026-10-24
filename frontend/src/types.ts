export type User = { id: number; email: string; role: 'admin' | 'user' }

export type Vehicle = {
  id: number
  make: string
  model: string
  category: string
  price: number
  quantity: number
}

export type VehicleInput = Omit<Vehicle, 'id'>

export type Filters = {
  make: string
  model: string
  category: string
  minPrice: string
  maxPrice: string
  available: boolean
}
