# Admin Panel Documentation

Access: log in with an account that has `role: 'admin'` (the seeded account from `ADMIN_EMAIL`, or any user promoted via Users → Change Role), then click **Admin Panel** in the navbar dropdown, or go directly to `/admin/dashboard`.

Every page here is protected twice: once at the page level (redirects non-admins away), and — the enforcement that actually matters — again at the API level (`/api/admin/*` rejects anything without a valid admin JWT, full stop). See `SECURITY_REPORT.md` for details.

## Dashboard (`/admin/dashboard`)
At-a-glance totals: total/active/new-today users, total analyses, fake vs. real counts, trending article count, pending reports. Plus an AI requests-today summary (with a link into AI Management) and a system health card (DB status, environment, uptime). Two charts: prediction breakdown (pie) and monthly activity (line).

## Users (`/admin/users`)
Search by name/email, filter by role and status. Per-user actions (dropdown menu):
- **Edit** — name/email
- **Change Role** — toggles user ↔ admin. Blocked if it would leave zero admins, or if you try to demote yourself.
- **Activate / Suspend / Ban** — status change. A suspended/banned user is immediately logged out (their `tokenVersion` is bumped) and can't log back in until reactivated. You can't change your own status.
- **Reset Password** — sets a new password for the user and logs out their existing sessions.
- **Delete** — permanent. Blocked for yourself or the last remaining admin.

## News (`/admin/news`)
Manages the **curated** trending feed (separate from the live NewsAPI feed shown alongside it on the public `/trending` page). Workflow: every new item starts as `draft`. Use the Actions menu to **Approve**, **Reject**, **Publish**, or **Unpublish** — only `published` items appear on the public site. **Feature** pins an item to the top of the public listing. Search/filter by status and category.

## Reports (`/admin/reports`)
User-submitted content flags (via `POST /api/news/report/:id` — not yet wired to a button in the main app UI; see `BUG_FIX_REPORT.md`). Mark as **Reviewed**, **Resolved**, or **Dismissed**, or delete outright. Each row shows the reporter, what was flagged, and their stated reason/message.

## AI Management (`/admin/ai`)
Requests today, success/error rate, average confidence, a provider-usage chart, and the 10 most recent AI errors with messages and timestamps. This data comes from `AIRequestLog`, written automatically by `aiService.js` on every analysis (manual or trending-ingestion), so it reflects real usage from day one — no separate instrumentation step needed.

## Analytics (`/admin/analytics`)
Four charts: daily new users (30d), daily analyses (30d), monthly user growth, and fake-vs-real distribution overall.

## Settings (`/admin/settings`)
Live-editable site configuration — site name/logo, contact info, AI provider selection, registration on/off, and **Maintenance Mode** (with a custom message shown to visitors). Changes apply immediately (cached for up to 30 seconds server-side, no redeploy). API keys/secrets are deliberately **not** editable here — they stay in `.env` only.

## Security (`/admin/security`)
Full audit trail: logins (success/fail), logouts, registrations, password resets, every role/status/news/report/settings change made by any admin, with actor, IP, and timestamp. Filterable by action type. Shows today's login/failed-login counts at the top.

---

## Extending the Admin Panel

- New admin API endpoints go in `controllers/adminController.js` + `routes/adminRoutes.js` — the router already applies `protect, requireActiveUser, authorize('admin')` to everything mounted under it, so a new route is secure by default.
- New admin pages: add a page route in `routes/viewRoutes.js` using the existing `requireAdminPage` guard, create the `.ejs` under `views/admin/`, and add a link in `views/admin/partials/sidebar.ejs`.
- Any admin action that changes data should call `recordAudit()` (`utils/auditLog.js`) so it shows up in the Security tab — see any existing `adminController.js` function for the pattern.
