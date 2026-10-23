/** Core types, business errors and the ports (interfaces) the services depend on. No I/O in here. */

export type Role = "admin" | "user";

export interface User {
  id: number;
  email: string;
  role: Role;
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}
export type VehicleInput = Omit<Vehicle, "id">;

export interface VehicleQuery {
  make?: string;
  model?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

/** Everything the API can deliberately refuse to do; the HTTP layer maps each code to a status. */
export type ErrorCode =
  | "NOT_FOUND"
  | "OUT_OF_STOCK"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "FORBIDDEN";

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Port: persistence of vehicles. Implemented by SQLite in production and by a fake in unit tests. */
export interface VehicleRepository {
  search(query: VehicleQuery): { items: Vehicle[]; total: number };
  find(id: number): Vehicle | undefined;
  insert(input: VehicleInput): Vehicle;
  update(id: number, input: VehicleInput): Vehicle | undefined;
  remove(id: number): boolean;
  /**
   * Atomically changes stock and records the matching StockEvent, or does neither.
   * Returns undefined if the vehicle is missing or stock would go negative.
   */
  adjustStock(change: StockChange): Vehicle | undefined;
}

export type StockEventKind = "purchase" | "restock";

export interface StockChange {
  vehicleId: number;
  userId: number;
  kind: StockEventKind;
  /** Negative for purchases, positive for restocks. */
  delta: number;
}

/** One line of the audit trail. `vehicle` is a name snapshot so history survives deleting the vehicle. */
export interface StockEvent {
  id: number;
  vehicleId: number | null;
  vehicle: string;
  userEmail: string;
  kind: StockEventKind;
  quantity: number;
  at: string;
}

/** Port: read side of the audit trail. */
export interface StockLedger {
  recent(limit: number): StockEvent[];
}

/** Port: persistence of users. */
export interface UserRepository {
  /** Creates a user; the very first one becomes admin. Returns undefined if the email is taken. */
  create(email: string, passwordHash: string): User | undefined;
  findByEmail(email: string): (User & { passwordHash: string }) | undefined;
}
