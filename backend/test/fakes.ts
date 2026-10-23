import type {
  StockChange,
  StockEvent,
  StockLedger,
  User,
  UserRepository,
  Vehicle,
  VehicleInput,
  VehicleRepository,
} from "../src/domain";

/** In-memory VehicleRepository + StockLedger: lets service tests run without HTTP or SQLite. */
export class FakeVehicleRepository implements VehicleRepository, StockLedger {
  vehicles: Vehicle[] = [];
  changes: StockChange[] = [];
  private nextId = 1;

  search() {
    return { items: [...this.vehicles], total: this.vehicles.length };
  }
  find(id: number) {
    return this.vehicles.find((v) => v.id === id);
  }
  insert(input: VehicleInput) {
    const vehicle = { id: this.nextId++, ...input };
    this.vehicles.push(vehicle);
    return vehicle;
  }
  update(id: number, input: VehicleInput) {
    const vehicle = this.find(id);
    return vehicle && Object.assign(vehicle, input);
  }
  remove(id: number) {
    const before = this.vehicles.length;
    this.vehicles = this.vehicles.filter((v) => v.id !== id);
    return this.vehicles.length < before;
  }
  adjustStock(change: StockChange) {
    const vehicle = this.find(change.vehicleId);
    if (!vehicle || vehicle.quantity + change.delta < 0) return undefined;
    vehicle.quantity += change.delta;
    this.changes.push(change);
    return vehicle;
  }
  recent(limit: number): StockEvent[] {
    return this.changes
      .slice(-limit)
      .reverse()
      .map((c, i) => ({
        id: i + 1,
        vehicleId: c.vehicleId,
        vehicle: "fake",
        userEmail: `user${c.userId}@x.com`,
        kind: c.kind,
        quantity: Math.abs(c.delta),
        at: "2026-01-01T00:00:00.000Z",
      }));
  }
}

export class FakeUserRepository implements UserRepository {
  users: (User & { passwordHash: string })[] = [];

  create(email: string, passwordHash: string) {
    if (this.findByEmail(email)) return undefined;
    const user = { id: this.users.length + 1, email, role: this.users.length ? ("user" as const) : ("admin" as const), passwordHash };
    this.users.push(user);
    return { id: user.id, email, role: user.role };
  }
  findByEmail(email: string) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }
}
