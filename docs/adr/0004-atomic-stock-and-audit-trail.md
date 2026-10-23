# 4. Atomic stock changes with a transactional audit trail

**Status:** accepted

**Context.** "Purchase decreases quantity" is the one operation where a bug costs money: two buyers must never get the last car.

**Decision.** Stock changes are one conditional statement, `UPDATE ... SET quantity = quantity + ? WHERE id = ? AND quantity + ? >= 0`, checked via the affected-row count, inside a `BEGIN IMMEDIATE` transaction that also inserts an `inventory_events` row. Either both happen or neither.

**Why not read-then-write.** `SELECT` then `UPDATE` has a window between them. A single conditional statement has none, and it keeps working if the app is ever run as several processes against the same database. Events store a name snapshot and use `ON DELETE SET NULL`, so deleting a vehicle never erases its sales history.

**Evidence.** A test fires 20 simultaneous purchases at stock 5 and expects exactly 5 successes. With the synchronous driver that test would also pass for a naive implementation inside one process; the conditional `UPDATE` is what protects the multi-process case, so the guarantee is enforced by SQL rather than by timing.
