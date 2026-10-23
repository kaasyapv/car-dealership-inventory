import type { DatabaseSync } from "node:sqlite";
import type { StockChange, StockEvent, StockLedger, Vehicle, VehicleInput, VehicleQuery, VehicleRepository } from "../domain";

/** Escapes LIKE wildcards so user input is matched literally. */
const contains = (s: string) => `%${s.replace(/[\\%_]/g, "\\$&")}%`;

export class SqliteVehicleRepository implements VehicleRepository, StockLedger {
  constructor(private readonly db: DatabaseSync) {}

  search(q: VehicleQuery) {
    const clauses: string[] = [];
    const params: (string | number)[] = [];
    for (const col of ["make", "model", "category"] as const) {
      if (q[col]) {
        clauses.push(`${col} LIKE ? ESCAPE '\\'`);
        params.push(contains(q[col]));
      }
    }
    if (q.minPrice !== undefined) (clauses.push("price >= ?"), params.push(q.minPrice));
    if (q.maxPrice !== undefined) (clauses.push("price <= ?"), params.push(q.maxPrice));
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const items = this.db.prepare(`SELECT * FROM vehicles ${where} ORDER BY id`).all(...params) as unknown as Vehicle[];
    return { items, total: items.length };
  }

  find(id: number) {
    return this.db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id) as Vehicle | undefined;
  }

  insert(v: VehicleInput) {
    const { lastInsertRowid } = this.db
      .prepare("INSERT INTO vehicles (make, model, category, price, quantity) VALUES (?, ?, ?, ?, ?)")
      .run(v.make, v.model, v.category, v.price, v.quantity);
    return this.find(Number(lastInsertRowid))!;
  }

  update(id: number, v: VehicleInput) {
    this.db
      .prepare("UPDATE vehicles SET make = ?, model = ?, category = ?, price = ?, quantity = ? WHERE id = ?")
      .run(v.make, v.model, v.category, v.price, v.quantity, id);
    return this.find(id);
  }

  remove(id: number) {
    return this.db.prepare("DELETE FROM vehicles WHERE id = ?").run(id).changes > 0;
  }

  /**
   * The stock check lives inside the UPDATE's WHERE clause, so check and write can't be separated and stock
   * never goes negative. The event insert shares the transaction: a change is never logged without happening.
   */
  adjustStock({ vehicleId, userId, kind, delta }: StockChange) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const { changes } = this.db
        .prepare("UPDATE vehicles SET quantity = quantity + ? WHERE id = ? AND quantity + ? >= 0")
        .run(delta, vehicleId, delta);
      const vehicle = changes ? this.find(vehicleId) : undefined;
      if (vehicle) {
        this.db
          .prepare("INSERT INTO inventory_events (vehicle_id, vehicle_label, user_id, kind, quantity) VALUES (?, ?, ?, ?, ?)")
          .run(vehicleId, `${vehicle.make} ${vehicle.model}`, userId, kind, Math.abs(delta));
      }
      this.db.exec("COMMIT");
      return vehicle;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  recent(limit: number) {
    return this.db
      .prepare(
        `SELECT e.id, e.vehicle_id AS vehicleId, e.vehicle_label AS vehicle, u.email AS userEmail,
                e.kind, e.quantity, e.created_at AS at
         FROM inventory_events e JOIN users u ON u.id = e.user_id
         ORDER BY e.id DESC LIMIT ?`,
      )
      .all(limit) as unknown as StockEvent[];
  }
}
