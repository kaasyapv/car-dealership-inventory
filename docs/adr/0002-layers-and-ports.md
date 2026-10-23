# 2. Layers with ports (domain / services / repositories / http)

**Status:** accepted. This was a deliberate **Refactor** step after the first green pass.

**Context.** The first version had routes containing validation, SQL and business rules together. Testing a rule meant booting HTTP.

**Decision.** `http/` validates and delegates, `services/` own the rules, `repositories/` are the only SQL, and `domain.ts` holds types, errors and the interfaces (ports) the services depend on. `app.ts` is the single composition root.

**Why.** Single responsibility, and dependency inversion in practice: `InventoryService` and `AuthService` are unit-tested against in-memory fakes in milliseconds, while the HTTP tests prove the whole stack. Errors are `DomainError`s with a stable `code`; one `errorHandler` maps codes to statuses.

**Not done on purpose.** No DI container, no generic repository base class, no CQRS. Four small ports are enough.
