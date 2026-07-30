# Changelog

All notable changes to this project. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — Admin Panel + RBAC + Auth rebuild, deployment readiness

### Added
- Real Role-Based Access Control: `User.status` (active/suspended/banned), `User.tokenVersion` (bulk token revocation), `middleware/rbac.js` (`authorize`, `requireActiveUser`)
- Refresh-token auth flow (`POST /api/auth/refresh-token`), short-lived access tokens (15m default)
- `utils/seedAdmin.js` — admin account auto-seeded from `.env` on every server startup; `createAdmin.js` now a thin wrapper around it
- `AuditLog` model + `utils/auditLog.js` — every sensitive action (auth events, admin actions) is logged; exposed via Admin → Security
- `AIRequestLog` model — every AI analysis call (success or failure) is logged; exposed via Admin → AI Management
- `Settings` model — live-editable site config (site name/logo, contact info, AI provider, maintenance mode, registration toggle) via Admin → Settings
- `ContentReport` model + `POST /api/news/report/:id` — users can flag an analysis for admin review; exposed via Admin → Reports
- `TrendingNews` moderation workflow: `status` (draft/approved/rejected/published/unpublished), `featured`, `approvedBy`/`approvedAt`
- Full admin controller/routes/views: Dashboard, Users, News, Reports, AI, Analytics, Settings, Security (previously only a 67-line stub controller existed)
- `middleware/maintenanceMode.js` + `views/maintenance.ejs`
- `GET /health` endpoint
- `utils/validateEnv.js` — fail-fast startup validation
- Graceful shutdown (SIGTERM/SIGINT) in `server.js`
- Jest test suite (`tests/`) — unit tests for RBAC middleware and the User model, integration tests for the auth flow and admin RBAC enforcement, using `mongodb-memory-server`
- `Dockerfile`, `.dockerignore`, `docker-compose.yml`
- `.github/workflows/ci.yml` — syntax check, test suite (Node 18.x/20.x), Docker build
- Deployment configs: `render.yaml`, `railway.json`, `vercel.json` + `api/index.js`, `netlify.toml` + `netlify/functions/api.js`
- Documentation: this file, `PROJECT_REPORT.md`, `BUG_FIX_REPORT.md`, `DEPLOYMENT_GUIDE.md`, `API_DOCUMENTATION.md`, `DATABASE_DOCUMENTATION.md`, `SECURITY_REPORT.md`, `TESTING_REPORT.md`, `ADMIN_PANEL_DOCUMENTATION.md`, rewritten `README.md`

### Changed
- `authController.js` — full rewrite: audit logging on all auth events, ban/suspend enforcement on login, refresh-token issuance
- `middleware/auth.js` — full rewrite: `tokenVersion` + status checks on every request, `optionalAuth` added for public pages that conditionally show user state
- `TrendingNews` public queries (home page, `/trending`) now filter to `status: 'published'` (backward-compatible with pre-existing records that predate the `status` field)
- `aiService.analyzeNews()` now accepts a `meta` argument and logs every call to `AIRequestLog`
- `config/database.js` — idempotent `connectDB()` (safe to call repeatedly, important for serverless warm starts), seeds admin on connect
- `package.json` — added `engines`, `test`/`seed:admin`/`docker:*` scripts, `jest`/`supertest`/`mongodb-memory-server`/`serverless-http` dependencies

### Fixed
See `BUG_FIX_REPORT.md` for the full list. Highlights: all three admin pages were 500ing (double layout-include bug), the `.env`-based admin login bypass has been removed, `trendingController.js` was missing a `require` for a model it used in three functions, the email-verification link pointed at a non-existent route, and the change-password page was calling a route with the wrong HTTP method.

### Removed
- The `.env`-based admin login bypass in `authController.login()`
- Dead admin "Add Trending" modal on the public trending page (superseded by the full News Management admin page)
- Unused `apiLimiter` export in `middleware/rateLimiter.js`
- `trendingController.addTrending`/`deleteTrending` (superseded by `adminController`'s fuller CRUD — avoids maintaining two copies of admin news-creation logic)

---

## Prior sessions

See `FIXES_REPORT.md` for the detailed, round-by-round history of earlier fixes (route mounting order, CSRF blocking all logins, missing image assets, dark-mode contrast, dead logout link, and more) that predate this changelog.
