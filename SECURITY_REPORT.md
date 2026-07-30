# Security Report

## Authentication

- Passwords hashed with **bcrypt** (`bcryptjs`), never stored or logged in plaintext.
- **JWT access + refresh token** model: short-lived access token (15 min default), longer-lived refresh token (7 days), both httpOnly + `sameSite: lax` cookies (also accepted via `Authorization: Bearer` header for API clients). The refresh cookie is scoped to `path: /api/auth` so it's never sent on unrelated requests.
- **Token revocation**: every user has a `tokenVersion` counter embedded in their JWTs. Password change, role change, and status change (ban/suspend) all bump it, instantly invalidating every previously-issued token for that user — there is no way to keep using an old token after one of these events.
- **No hard-coded credentials**: the previous `.env`-based admin login bypass (`ADMIN_EMAIL`/`ADMIN_PASSWORD` checked directly in the login handler, minting a token for a non-existent `id: 'admin'` user) has been removed entirely. The admin is a real MongoDB user, auto-seeded on startup, authenticated through the exact same path as everyone else.
- Failed login attempts are tracked per-user (`failedLoginAttempts`) and logged to the audit trail with the attempted email even when no matching account exists.
- Auth routes (`/login`, `/register`, `/refresh-token`, `/forgot-password`, `/reset-password`) are rate-limited to 5 requests/hour/IP (`authLimiter`) as brute-force protection.

## Authorization (RBAC)

- `middleware/rbac.js`: `authorize(...roles)` for route-level role gating, `requireActiveUser` to reject banned/suspended accounts even with an otherwise-valid token.
- Every `/api/admin/*` route runs `protect → requireActiveUser → authorize('admin')` as router-level middleware — there is no individual admin route that skips this chain.
- Page routes (`/admin/*`) have a **separate**, redundant guard (`requireAdminPage` in `viewRoutes.js`) so a non-admin never even sees the page shell — but the real enforcement is always on the API side, since the page guard alone would do nothing to stop a direct API call.
- Guardrails against self-lockout: an admin cannot demote/suspend/ban/delete themselves, and the last remaining admin account cannot be demoted or deleted.

## Input Handling

- `express-mongo-sanitize` strips `$`/`.` operators from user input to prevent NoSQL injection.
- `express-validator` on registration; controller-level validation (enum checks, required fields) throughout `adminController.js`.
- `middleware/sanitize.js` sanitizes free-text body fields against XSS before they reach the AI service or database.
- File uploads (`multer`) are scoped to images, with Cloudinary as the production-recommended backend.

## Transport & Headers

- **Helmet** applied globally for standard security headers.
- **CORS** currently configured with `origin: true, credentials: true` (reflects the request origin). This is intentionally permissive for a project still under active development across `localhost`; **before a public production launch, pin this to your actual frontend origin(s)** rather than reflecting any origin — see "Known Limitations" below.
- **CSRF** protection (`csurf`, cookie-based) applies to all server-rendered form routes; `/api/*` routes are exempt because they authenticate via JWT (bearer/cookie), not session cookies, so a CSRF token isn't meaningful there.
- Cookies are `httpOnly` always, and `secure: true` automatically once `NODE_ENV=production`.

## Auditing

- `AuditLog` records logins (success/failure), logouts, registration, password reset requests/completions, email verification, every admin action on users/news/reports/settings, and admin seeding — with actor, IP, user-agent, and a `details` field for context (e.g. `{ from: 'user', to: 'admin' }`).
- Exposed via Admin → Security, filterable by action type, with a same-day logins/failed-logins summary.

## Rate Limiting & Abuse Prevention

- Global `/api/*` limiter: 1000 requests / 15 min / IP.
- Stricter `authLimiter` (5/hour/IP) on the auth-specific routes listed above.
- `app.set('trust proxy', 1)` ensures rate limiting keys off the real client IP when deployed behind a reverse proxy (Render/Railway/Docker+nginx), not the proxy's own address.

## Secrets Management

- All secrets (JWT signing keys, DB URI, AI API keys, SMTP credentials, Cloudinary keys) live in `.env`, which is git-ignored. `.env.example` documents every variable without real values.
- The admin Settings page intentionally does **not** expose or store API keys — those stay server-side only.
- `utils/validateEnv.js` fails the server startup loudly if `MONGODB_URI` or `JWT_SECRET` is missing, rather than limping along and failing confusingly on first request.

## Known Limitations / Recommended Follow-ups

These are honest gaps, not hidden ones:

1. **CORS is currently permissive** (`origin: true`). Fine for development; pin to specific origins before a public launch.
2. **No 2FA / MFA** for admin accounts. Given the admin panel's authority, this would be a natural next step.
3. **No IP-based lockout** beyond rate limiting — `failedLoginAttempts` is tracked and audited but doesn't yet trigger an automatic temporary lock. Straightforward to add on top of the existing field.
4. **File uploads on serverless (Vercel/Netlify)**: local disk storage does not persist between invocations. Cloudinary is effectively required, not just recommended, on those two platforms — see `DEPLOYMENT_GUIDE.md`.
5. **Session store** (`connect-mongo`) coexists with the JWT auth system for `express-session`/CSRF purposes; it doesn't hold auth state itself, but it does mean a MongoDB connection is required even for otherwise-static form pages.
6. **No automated dependency vulnerability scanning** beyond the non-blocking `npm audit --audit-level=high` step in CI — worth promoting to a blocking check (or adding Dependabot) once the dependency tree stabilizes.
