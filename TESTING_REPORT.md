# Testing Report

## Automated Test Suite

```bash
npm test
```

Runs on Jest + Supertest, against an in-memory MongoDB (`mongodb-memory-server`) — **no real database or `.env` needed** to run the suite; `tests/env.js` supplies dummy-but-valid config, and `tests/dbSetup.js` spins up/tears down a fresh in-memory instance per test file. `app.js` skips its own `connectDB()` call when `NODE_ENV=test`, so tests fully control the database lifecycle.

### Coverage

| File | What it covers |
|---|---|
| `tests/models/user.test.js` | Password is hashed on save (never stored plaintext); `matchPassword` correctly accepts/rejects; new users default to `status: active`, `tokenVersion: 0`, `role: user`; duplicate email is rejected. |
| `tests/middleware/rbac.test.js` | `authorize()` allows a matching role through and rejects with 401 (no user) / 403 (wrong role); `requireActiveUser()` passes active users and rejects banned/suspended with 403. Pure unit tests, mocked `req`/`res`, no DB. |
| `tests/integration/auth.test.js` | `GET /health` returns 200; full register → login → `GET /api/auth/me` flow works end-to-end against the real Express app; login correctly fails (401) with a wrong password; **`GET /api/admin/stats` is confirmed to reject both an unauthenticated request (401) and a logged-in non-admin (403)** — i.e. the core RBAC fix from this session is actually verified, not just asserted in prose. |

### Running a single file / watching

```bash
npx jest tests/middleware/rbac.test.js
npx jest --watch
```

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`/`master`/`develop`:
1. `node --check` on every `.js` file in the repo (catches syntax errors before they ever reach a PR)
2. `npm test` on Node 18.x and 20.x
3. `npm audit --audit-level=high` (non-blocking — see `SECURITY_REPORT.md`)
4. A separate job builds the Docker image, so a broken `Dockerfile`/build fails CI too

## What's Verified vs. What Isn't

**Verified by this session's work** (via `node --check`, static analysis, and the test suite above):
- Every route file's controller references resolve to an actually-exported function (cross-checked programmatically — see `BUG_FIX_REPORT.md`)
- All new/modified `.js` files parse without syntax errors
- The register/login/me flow and admin RBAC gating work end-to-end against a real (in-memory) database
- All deployment config files (`render.yaml`, `railway.json`, `vercel.json`) are well-formed JSON/YAML

**Not verified — requires a real environment**, since this session had no network/database access:
- Actual AI provider calls (Groq/Gemini) — `aiService.js` logic is reviewed but not exercised against a live API
- Email delivery (`emailService.js`) — SMTP requires real credentials
- Cloudinary image uploads
- The full admin UI click-through (dashboard charts, modals, SweetAlert2 flows) in a real browser
- Live deployment on any of Render/Railway/Vercel/Netlify/Docker (configs are written and validated for syntax, but not deployed)
- Load/performance testing

## Recommended Manual QA Checklist Before Launch

- [ ] `npm install && npm run dev`, confirm the admin auto-seeds and you can log in with `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- [ ] Register a normal user, verify email link works (needs real SMTP creds)
- [ ] Run an analysis, confirm it appears in History, bookmark it, export CSV, download the PDF report
- [ ] As admin: ban a test user, confirm they're immediately logged out and can't log back in; unban and confirm they can
- [ ] As admin: create a news item, approve it, publish it, confirm it appears on the public `/trending` page; unpublish and confirm it disappears
- [ ] Flag an analysis via `POST /api/news/report/:id` (not yet wired to a UI button — see `BUG_FIX_REPORT.md`), confirm it shows up in Admin → Reports
- [ ] Toggle Maintenance Mode in Settings, confirm non-admins see the maintenance page and admins don't
- [ ] Hit `/api/admin/stats` with no token and with a non-admin token, confirm 401/403 respectively (already covered by the automated suite, worth re-confirming manually against your real deployment)
