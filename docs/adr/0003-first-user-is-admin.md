# 3. The first registered user becomes the admin

**Status:** accepted

**Context.** The brief needs admin-only endpoints but defines no way to become an admin. Letting the client send `role: "admin"` at registration would make every authorization check meaningless.

**Decision.** Roles are assigned by the server. The first account created is `admin`; all later ones are `user`. The decision is made inside the `INSERT` (`CASE WHEN EXISTS (SELECT 1 FROM users)`), so two simultaneous first registrations can't both become admin.

**Alternatives.** An `ADMIN_EMAIL` environment variable (more ceremony for a reviewer), a seed-only admin (needs a manual step). `npm run seed` still creates a demo admin for convenience.

**Consequences.** Whoever deploys first owns the admin account. There is no promote/demote UI; that would be the next feature.
