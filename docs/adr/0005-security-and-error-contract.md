# 5. Security posture and error contract

**Status:** accepted

**Decisions.**
- Passwords: bcrypt (cost 10; 4 in tests), 8 to 72 characters (bcrypt ignores bytes past 72).
- Tokens: 8h JWT. `JWT_SECRET` is validated at startup; production refuses to boot without 32+ characters.
- Login returns the same `401` for unknown email and wrong password, and compares against a decoy hash for unknown emails so response time doesn't leak which emails exist.
- `/api/auth/*` is rate limited (default 20 per 15 minutes per IP) to slow credential stuffing.
- `helmet` headers; CORS origin is configurable.
- Authorization is enforced on the server for every mutating route; the UI hiding admin buttons is only convenience.
- Errors are always `{ error, code }` (plus `details` for validation). Clients branch on `code`, never on message text.

**Known limits.** No refresh tokens or revocation (a token lives until expiry), the rate limiter is in-memory (per process), no email verification or password reset.
