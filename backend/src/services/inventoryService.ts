import { DomainError, type StockEventKind, type StockLedger, type Vehicle, type VehicleInput, type VehicleQuery, type VehicleRepository } from "../domain";

/** Catalogue and stock rules. Knows nothing about HTTP or SQL. */
export class InventoryService {
  constructor(
    private readonly vehicles: VehicleRepository,
    private readonly ledger: StockLedger,
  ) {}

  search(query: VehicleQuery = {}) {
    return this.vehicles.search(query);
  }

  create(input: VehicleInput): Vehicle {
    return this.vehicles.insert(input);
  }

  update(id: number, patch: Partial<VehicleInput>): Vehicle {
    const current = this.get(id);
    return this.vehicles.update(id, { ...current, ...patch })!;
  }

  remove(id: number): void {
    if (!this.vehicles.remove(id)) throw notFound();
  }

  purchase(id: number, userId: number, quantity = 1): Vehicle {
    return this.adjust(id, userId, "purchase", -quantity);
  }

  restock(id: number, userId: number, amount: number): Vehicle {
    return this.adjust(id, userId, "restock", amount);
  }

  activity(limit: number) {
    return this.ledger.recent(limit);
  }

  private get(id: number): Vehicle {
    const vehicle = this.vehicles.find(id);
    if (!vehicle) throw notFound();
    return vehicle;
  }

  private adjust(id: number, userId: number, kind: StockEventKind, delta: number): Vehicle {
    const updated = this.vehicles.adjustStock({ vehicleId: id, userId, kind, delta });
    if (updated) return updated;
    this.get(id); // distinguishes "no such vehicle" from "not enough stock"
    throw new DomainError("OUT_OF_STOCK", "Vehicle is out of stock");
  }
}

const notFound = () => new DomainError("NOT_FOUND", "Vehicle not found");
