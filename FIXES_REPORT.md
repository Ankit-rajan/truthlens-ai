# TruthLens — Bug Analysis & Fix Report

## Round 5 — Root cause of "Failed to load trending" on homepage reload

### 11. `trending.js` hardcoded a container ID that only exists on one of the two pages that load it
**Files:** `public/js/trending.js`, `controllers/trendingController.js`
**Issue:** `public/js/trending.js` is loaded by both `views/trending.ejs` (`<div id="trendingContainer">`)
and `views/index.ejs` (`<div id="trendingFeed">`), but the script only ever
looked up `document.getElementById('trendingContainer')`. On the homepage
that returns `null`. The `axios.get('/api/trending')` call itself succeeded
every time — the backend was never the problem — but the very next line,
`container.innerHTML = ...`, threw `TypeError: Cannot set properties of
null`, which was caught by the surrounding `try/catch` and displayed as
**"Failed to load trending"**, even though real trending data had just been
fetched successfully. This matches the exact symptom described ("Homepage
reload sometimes shows Failed to load trending" — API/Mongo/backend were all
fine; a frontend TypeError was being mislabeled as a network failure).
**Fix:** `trending.js` now resolves whichever container is present
(`trendingContainer` or `trendingFeed`) and returns early if the page has
neither, instead of crashing. Also added an optional `?limit=` query param
(capped 1–20 server-side) so the homepage preview only requests 3 cards
instead of the full 20-item list meant for the dedicated `/trending` page.
**Impact:** Homepage trending preview now renders reliably; no more false
error toast on a successful API response.

### Verified this round
- Ran `node --check` on every backend file and every file in `public/js/` —
  no syntax errors anywhere in the project.
- Re-reviewed `app.js` middleware order, `middleware/auth.js`
  (`protect`/`protectPage`/`optionalAuth`), and `controllers/authController.js`
  end-to-end against the Round 1–4 fixes — auth/session/cookie logic is
  consistent and I didn't find regressions or new issues there.
- Confirmed `res.locals.currentUser` default-null pattern in `app.js` is
  intentionally overridden by `middleware/auth.js` per-route, not a bug.



Stack detected: **Node.js + Express + MongoDB (Mongoose) + EJS** (server-rendered
views), not React/MERN — noting this because your instructions said "MERN," but
there's no React frontend here. Everything below applies to the actual stack.

I could not run `npm install` / `npm run dev` in this environment (no network
access in this sandbox), so these are static-analysis fixes, verified with
`node --check` on every edited file. Test the build on your machine before
deploying — see "How to verify" at the bottom.

---

## ✔ Critical bugs found & fixed (app was fully broken before these)

### 0. Route mounting order — every /api/* request 404'd, including login
**File:** `app.js`
**Issue:** `app.use('/', viewRoutes)` was mounted **before** the `/api/*`
route mounts. `viewRoutes.js` ends with a catch-all
(`router.use(optionalAuth, (req, res) => res.status(404)...)`) that matches
*any* HTTP method on any unrecognized path. Because it was reached first,
**every request to `/api/auth/login`, `/api/auth/register`, `/api/news/*`,
`/api/admin/*`, `/api/trending/*` (GET or POST) got a 404 from viewRoutes and
never reached the actual API routers.** This is what you just hit clicking
into `/api/auth/login`.
**Fix:** Mounted `authRoutes`, `newsRoutes`, `adminRoutes`, `trendingRoutes`
before `viewRoutes` in `app.js`, so `/api/*` resolves correctly before
falling through to the page-router's catch-all.

### 1. CSRF protection blocked *every* login/register/API request
**File:** `app.js`
**Issue:** `app.use(csurf({ cookie: true }))` was applied globally, including
to `/api/*`. Your login/signup pages (`views/login.ejs`, `views/signup.ejs`)
submit via `axios.post()` with a plain `{ email, password }` JSON body — the
`_csrf` hidden input value was never attached to that request. Result: every
POST to `/api/auth/login`, `/api/auth/register`, `/api/news/detect`, etc.
returned `403 invalid csrf token`. **Nobody could log in, sign up, or do
anything that writes data.** This was the #1 blocker.
**Fix:** CSRF middleware now only runs for non-`/api` (server-rendered form)
routes. JWT-authenticated API routes rely on the httpOnly, `sameSite: 'lax'`
cookie instead, which already mitigates CSRF for this pattern.
**Impact:** Login, signup, analyze, bookmarks, admin actions — all now work.

### 2. Protected pages showed raw JSON instead of redirecting to login
**File:** `middleware/auth.js`, `routes/viewRoutes.js`
**Issue:** `viewRoutes.js` reused the API's `protect` middleware (which
returns `res.status(401).json(...)`) on page routes like `/dashboard`,
`/analyze`, `/profile`. A logged-out user visiting `/dashboard` in a browser
got a raw JSON error page instead of a login redirect.
**Fix:** Added `protectPage` (redirects to `/login?redirect=...`) for page
routes, and `optionalAuth` (populates `req.user` without blocking) for public
pages like `/`, `/trending`, `/login`, `/signup`. Swapped these into
`viewRoutes.js`.
**Impact:** Proper redirects; navbar now correctly reflects logged-in state
on public pages too (previously `req.user` was always `undefined` there).

### 3. `ReferenceError: fs is not defined` — crashed PDF report generation
**File:** `controllers/newsController.js`
**Issue:** `generateReport` calls `fs.existsSync` / `fs.mkdirSync`, but `fs`
was never `require`'d in this file. Every "Download Report" click would
500-crash.
**Fix:** Added `const fs = require('fs');`.

### 4. Session/auth cookies not environment-aware
**File:** `app.js`, `controllers/authController.js`
**Issue:** Session cookie had `secure: false` hardcoded (fine on localhost,
insecure in production over HTTPS — browsers should reject non-secure
transmission). No `sameSite` set on either cookie.
**Fix:** `secure: process.env.NODE_ENV === 'production'` + `sameSite: 'lax'`
on both the session cookie and the JWT auth cookie.

### 5. CSRF errors leaked a generic 500
**File:** `middleware/errorHandler.js`
**Fix:** Added an explicit `EBADCSRFTOKEN` branch returning a clean 403
message instead of falling through to "Internal Server Error."

---

## Other things I noticed (not yet changed — flagging for your call)

- **`authLimiter`** (`middleware/rateLimiter.js`) allows only 5 attempts/hour
  per IP on login+register combined. Reasonable for prod, but you'll hit it
  fast while testing locally — consider a higher limit outside production.
- **URL-based analysis is a stub**: `newsController.detectNews` doesn't
  actually fetch/extract article text from a submitted URL — it just embeds
  the URL as a placeholder string ("Content not extracted..."). If URL
  analysis is meant to be a real feature, that needs an extraction service.
- **`services/aiService.js`, `factCheckService.js`, `sourceAnalysisService.js`**
  — I haven't audited these yet (they depend on `OPENAI_API_KEY` /
  `GEMINI_API_KEY` from your `.env`, which I obviously can't test without
  keys). Worth a dedicated pass to confirm error handling if the AI API call
  fails or times out.
- **`.env.example`** is missing a `NODE_ENV` line — worth adding so
  `NODE_ENV=production` is documented for deploy.

---

---

## Round 4 — Missing image assets (404s in your server log)

### 10. `public/images/` only had one empty file — 6 referenced images 404'd
**Files:** `public/images/*`
**Issue:** `default-avatar.png`, `hero-illustration.svg`, `hero-pattern.svg`,
`avatar-1.jpg`, `avatar-2.jpg`, `avatar-3.jpg` were referenced across
`index.ejs`, `navbar.ejs`, `dashboard.ejs`, `profile.ejs`, and `style.css`
but never existed in the folder — every page load had 4-6 image 404s.
`default-news.jpg` (used as the trending-page fallback thumbnail) existed
but was a 0-byte empty file, so it rendered as a broken image too.
**Fix:** Generated placeholder assets in your brand palette
(`#6c5ce7`/`#a29bfe`/`#00b894`): a generic user-silhouette `default-avatar.png`,
three initials-based testimonial avatars, an abstract "document + magnifying
glass" `hero-illustration.svg`, a subtle dot-pattern `hero-pattern.svg`, and
a branded `default-news.jpg` fallback thumbnail. These are placeholders —
swap in real photography/illustration whenever you have final brand assets,
but the 404s are gone and nothing renders as a broken-image icon anymore.

---

## Round 3 — Root cause of "form submits show raw JSON" / broken JS across the app

### 9. `layout extractScripts`/`extractStyles` silently deleted inline `<script>`/`<style>` blocks from EVERY page
**File:** `app.js`
**Issue:** `app.set('layout extractScripts', true)` and
`app.set('layout extractStyles', true)` tell `express-ejs-layouts` to pull
inline `<script>`/`<style>` tags out of each view and render them separately
via `defineContent('scripts')` / `defineContent('styles')` placeholders in
the layout — but `layout.ejs` never calls those placeholders anywhere. The
extracted content had nowhere to go, so it was **silently dropped from the
rendered HTML entirely.**
Concretely: `login.ejs`'s submit handler (the one with `e.preventDefault()`
+ `axios.post(...)`) never reached the browser. So the `<form action="/api/
auth/login" method="POST">` fell back to a plain native HTML submit —
browser navigated straight to `/api/auth/login` and rendered the raw JSON
response. That's exactly the screenshot you sent. Same thing hit `signup.ejs`
— and its form had no `method` attribute at all, so the browser's default
GET submit put `password=...` in plain text in the URL (visible in your
server log: `GET /signup?...&password=ANKIT123`).
This same stripping affected **every other page with inline scripts**:
`change-password`, `forgot-password`, `reset-password`, `profile`,
`history`, `index`, and all 3 admin pages — 11 files total. Any button/form
on those pages that depended on its own `<script>` block was silently
non-functional.
**Fix:** Turned `extractScripts`/`extractStyles` off in `app.js` (layout
doesn't use them), so inline scripts/styles stay exactly where they're
written and execute normally. Also added `method="POST"` and
`action="/api/auth/register"` to `signup.ejs`'s form as a safety net so a
password can never leak into the URL even if JS fails for some other reason.
**Impact:** Login, signup, and the JS on every other page listed above
should now actually run. This was the real reason login "showed JSON" and
signup leaked the password into the URL.

---

## Round 2 — Dark mode invisible text + logout link (follow-up)

### 6. Dark mode made the navbar (and other sections) unreadable
**Files:** `public/css/dark-mode.css`, `public/js/dark-mode.js`
**Issue:** `<nav class="navbar navbar-expand-lg glass-nav fixed-top">` has
neither `.navbar-light` nor `.navbar-dark`, so Bootstrap's default nav-link
color stays dark text regardless of theme. `dark-mode.css` only changed the
navbar's *background* to dark — never the text color — so links/brand/
hamburger icon became dark-on-dark (invisible), only distinguishable on
`:hover` because Bootstrap's hover color is a slightly different shade.
Same root cause hit `.bg-light` sections (index page stats/features/FAQ,
report content box) and `.table` (history, admin users/trending) — light-
grey background stayed light-grey in dark mode while text tried to go light
too, killing contrast either way.
**Fix:** Rewrote `dark-mode.css` with explicit overrides for nav-link/brand/
dropdown/toggler-icon color, `.btn-ghost`, `.bg-light` sections, `.table`
(via Bootstrap's `--bs-table-*` CSS vars), and form controls (`.form-control`/
`.form-select` background+text+placeholder), so nothing goes dark-on-dark or
light-on-light. Also added `console.log` calls in `dark-mode.js` on init and
on every toggle, so the current state is visible in devtools.

### 7. Logout button was dead — 404'd instead of logging out
**File:** `views/partials/navbar.ejs`
**Issue:** The Logout link pointed to `href="/logout"`, which has no page
route (falls into the 404 catch-all — this ties back to fix #0). It also
didn't have the `.logout-btn` class that `main.js` listens on, so even with
JS enabled the click handler never attached.
**Fix:** Changed to `href="/api/auth/logout"` with `class="logout-btn"` so
`main.js`'s existing handler intercepts the click, calls the API, and
redirects to `/login`.

### 8. Console logging for key actions (per your request)
**Files:** `public/js/main.js`, `public/js/dark-mode.js`, `views/login.ejs`,
`views/signup.ejs`
- Added a **global axios response interceptor** in `main.js` — every failed
  API call (any page, any request) now auto-logs method, URL, status, and
  message to console, without needing to hand-instrument each call.
- Added explicit `console.log`/`console.error` around login attempt/success/
  failure, signup attempt/success/failure, logout request/success/failure,
  and dark-mode init/toggle.

## Not done in this pass (scope reality check)

Your instructions covered 8 full phases (UI/UX overhaul across every page,
responsive testing at 8 breakpoints, performance/bundle optimization, full
security audit, deployment checklist). That's genuinely a multi-day, multi-
session engagement, not something to fake-complete in one reply. What I did
this round: a real Phase 1 analysis + fixed every bug that was actively
**breaking the app** (auth/CSRF was a full blocker — nothing worked before
this).

Good next step, if you want: pick one phase at a time — I'd suggest UI/UX
pass on the auth pages + dashboard first, since those are what a portfolio
reviewer sees first. Say the word and I'll go through it page by page.

---

## How to verify

```bash
cd truthlens
npm install
cp .env.example .env   # fill in real values
npm run dev
```
Then test: signup → login → analyze → dashboard → logout, and check the
server console for a clean start (no `ReferenceError`, no `EBADCSRFTOKEN`
on login).
