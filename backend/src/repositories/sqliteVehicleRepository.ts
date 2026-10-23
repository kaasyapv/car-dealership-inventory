import type { DatabaseSync } from "node:sqlite";
import type { Vehicle, VehicleInput, VehicleQuery, VehicleRepository } from "../domain";

/** Escapes LIKE wildcards so user input is matched literally. */
const contains = (s: string) => `%${s.replace(/[\\%_]/g, "\\$&")}%`;

export class SqliteVehicleRepository implements VehicleRepository {
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

  /** One conditional UPDATE: the stock check and the write can't be separated, so stock never goes negative. */
  adjustStock(id: number, delta: number) {
    const { changes } = this.db
      .prepare("UPDATE vehicles SET quantity = quantity + ? WHERE id = ? AND quantity + ? >= 0")
      .run(delta, id, delta);
    return changes ? this.find(id) : undefined;
  }
}
