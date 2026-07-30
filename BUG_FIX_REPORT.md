# Bug Fix Report

This is a consolidated summary. Full technical detail (exact diffs, root-cause analysis) for every item below lives in [`FIXES_REPORT.md`](./FIXES_REPORT.md), which is the running log kept across sessions.

## Critical (app-breaking) bugs fixed

| # | Bug | Impact | Status |
|---|---|---|---|
| 1 | Route mounting order — `viewRoutes`'s catch-all was mounted before `/api/*` routes | Every API call (including login) 404'd | ✅ Fixed |
| 2 | CSRF middleware applied globally, including to JSON API routes | Every login/register/API POST failed with 403 | ✅ Fixed |
| 3 | Protected pages returned raw JSON instead of redirecting unauthenticated users | Broken UX, looked like a crash | ✅ Fixed |
| 4 | `fs` used without being imported in PDF report generation | Report downloads crashed | ✅ Fixed |
| 5 | Session/auth cookies not environment-aware (`secure` flag) | Cookies silently rejected in some environments | ✅ Fixed |
| 6 | Dark mode made navbar/sections unreadable | Cosmetic but severe (illegible text) | ✅ Fixed |
| 7 | Logout link 404'd | Users couldn't log out | ✅ Fixed |
| 8 | `layout extractScripts`/`extractStyles` silently deleted every inline `<script>`/`<style>` block | Every form on the site fell back to native (broken) submission | ✅ Fixed |
| 9 | `public/images/` missing 6 referenced image files | Broken images across the site | ✅ Fixed |
| 10 | `trending.js` hard-coded a container ID only present on one of two pages that load it | "Failed to load trending" on homepage | ✅ Fixed |
| 11 | **All three admin pages 500'd** — stray manual `layout.ejs` include double-wrapped every admin page | Entire admin panel was inaccessible | ✅ Fixed (this session) |
| 12 | **Hard-coded `.env` admin login bypass** in `authController.login()` | Admin auth bypassed hashing/RBAC/DB entirely, minted tokens for a non-existent user | ✅ Fixed (this session) |
| 13 | `TrendingNews` model referenced without being imported in `trendingController.js` | `addTrending`/`deleteTrending`/`getTrendingById` crashed on use | ✅ Fixed (this session) |

## Moderate bugs fixed

| # | Bug | Status |
|---|---|---|
| 14 | Email verification link pointed at a non-existent page route | ✅ Fixed |
| 15 | `change-password` page POSTed to a route defined as PUT | ✅ Fixed |
| 16 | Dead admin "Add Trending" modal on the public trending page, posting to a removed route | ✅ Fixed |
| 17 | Unused `apiLimiter` export (dead code) | ✅ Removed |

## New capability (not bugs, but closes gaps the original brief flagged)

- Real RBAC (roles + account status), replacing the informal "admin === special email" model
- Refresh tokens with bulk revocation (`tokenVersion`) — password/role/status changes now actually invalidate old sessions, which was not previously possible at all
- Full admin Users/News/Reports/AI/Analytics/Settings/Security surface (previously ~67 lines total, essentially a stub)
- Audit logging for every sensitive action
- Maintenance mode, `/health` check, environment validation, graceful shutdown
- Docker, CI, and deployment configs for Render/Railway/Vercel/Netlify
- A real automated test suite (previously none existed)

## Known open item

`POST /api/news/report/:id` (content flagging) is implemented and tested at the API level but has no button wired up in the main app UI yet — see `TESTING_REPORT.md`'s manual QA checklist and `FIXES_REPORT.md` Round 6 for detail. Recommended as the next small follow-up.

## Verification method

Every `.js` file touched across all sessions was checked with `node --check` before being considered done. This session additionally cross-checked every route file's controller references against actual `exports.*` in the corresponding controller programmatically (see `TESTING_REPORT.md`), and added an automated test asserting the RBAC fix (#12) actually rejects non-admins, rather than relying on manual inspection alone.
