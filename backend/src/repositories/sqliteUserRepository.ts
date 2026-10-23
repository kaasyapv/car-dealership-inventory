import type { DatabaseSync } from "node:sqlite";
import type { User, UserRepository } from "../domain";

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(email: string, passwordHash: string) {
    try {
      // Role is assigned inside the INSERT so "first user" can't race with a second registration.
      return this.db
        .prepare(
          `INSERT INTO users (email, password_hash, role)
           VALUES (?, ?, CASE WHEN EXISTS (SELECT 1 FROM users) THEN 'user' ELSE 'admin' END)
           RETURNING id, email, role`,
        )
        .get(email, passwordHash) as unknown as User;
    } catch (e) {
      if (/UNIQUE constraint failed/.test((e as Error).message)) return undefined;
      throw e;
    }
  }

  findByEmail(email: string) {
    const row = this.db.prepare("SELECT id, email, role, password_hash FROM users WHERE email = ?").get(email) as
      | (User & { password_hash: string })
      | undefined;
    return row && { id: row.id, email: row.email, role: row.role, passwordHash: row.password_hash };
  }
}
