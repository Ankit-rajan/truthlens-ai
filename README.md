# TruthLens — AI-Powered Fake News Detection Platform

TruthLens analyzes news articles with an AI model (Groq/Llama by default, Gemini as an alternative) and returns a verdict — Fake, Likely Fake, Partially True, or True — with a confidence score and explanation. It includes a full user-facing app (analyze, history, bookmarks, PDF reports) and an enterprise-style admin panel with RBAC, moderation, analytics, and audit logging.

> 📄 See also: [`PROJECT_REPORT.md`](./PROJECT_REPORT.md) (what changed and why), [`ADMIN_PANEL_DOCUMENTATION.md`](./ADMIN_PANEL_DOCUMENTATION.md), [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md), [`DATABASE_DOCUMENTATION.md`](./DATABASE_DOCUMENTATION.md), [`SECURITY_REPORT.md`](./SECURITY_REPORT.md), [`TESTING_REPORT.md`](./TESTING_REPORT.md), [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md), [`BUG_FIX_REPORT.md`](./BUG_FIX_REPORT.md), [`CHANGELOG.md`](./CHANGELOG.md).

---

## Features

### Core
- AI-powered fake news detection (Groq/Llama or Gemini) with confidence scoring and reasoning
- Analysis history, bookmarking, CSV export, and per-analysis PDF report generation
- Curated "Trending" news feed with a moderation workflow (draft → approved/rejected → published)
- Live trending feed pulled from NewsAPI, independently AI-scored

### Auth
- JWT access + refresh tokens (httpOnly, sameSite cookies), password hashing (bcrypt), email verification, forgot/reset password
- Every token is revocable in bulk via a per-user `tokenVersion` (password change, role change, ban/suspend all force re-login)
- Admin is a normal MongoDB user (`role: 'admin'`) — no `.env`-based login bypass. Auto-seeded on first boot from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

### Admin Panel (`/admin`)
- **Dashboard** — users, analyses, fake/real breakdown, AI request stats, system health, charts
- **Users** — search/filter, ban/suspend/activate, role changes, admin-initiated password reset, delete (with last-admin safety checks)
- **News** — create/edit/delete curated articles, approve/reject/publish/unpublish workflow, featured flag
- **Reports** — user-submitted content flags: mark reviewed/resolved/dismissed, delete
- **AI Management** — requests today, success/error rate, average confidence, provider breakdown, recent errors
- **Analytics** — daily/monthly users, daily analyses, fake vs. real, growth charts
- **Settings** — site name/logo, contact info, AI provider, maintenance mode, registration toggle (all live-editable, no redeploy needed)
- **Security** — full audit log (logins, failed logins, admin actions), filterable by action type

All admin API routes are protected by `middleware/rbac.js` (`authorize('admin')` + `requireActiveUser`), independent of the page-level guard — hitting the API directly without an admin JWT is rejected exactly the same as browsing to `/admin/*` without one.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 18+, Express 4 |
| Views | EJS + `express-ejs-layouts`, Bootstrap 5, Chart.js, SweetAlert2 |
| Database | MongoDB + Mongoose |
| Auth | JWT (`jsonwebtoken`), `bcryptjs`, `express-session` + `connect-mongo` |
| AI | Groq SDK (Llama) primary, Google Gemini as an alternate provider |
| Security | Helmet, `express-mongo-sanitize`, `express-rate-limit`, CSRF (form routes), XSS sanitization |
| Testing | Jest, Supertest, `mongodb-memory-server` |
| Images | Cloudinary (optional — falls back to local `/uploads`) |

---

## Project Structure

```
truthlens/
├── app.js                  # Express app: middleware, route mounting, maintenance mode, health check
├── server.js                # Entry point: env validation, graceful shutdown
├── config/
│   ├── database.js          # Mongo connection (idempotent — safe on serverless warm starts)
│   └── cloudinary.js
├── controllers/              # authController, adminController, newsController, trendingController
├── middleware/                # auth (JWT), rbac (roles), rateLimiter, sanitize, upload, errorHandler, maintenanceMode
├── models/                   # User, NewsHistory, TrendingNews, Category, Report, ContentReport, AuditLog, AIRequestLog, Settings
├── routes/                    # authRoutes, newsRoutes, adminRoutes, trendingRoutes, viewRoutes
├── services/                  # aiService (Groq/Gemini), emailService, pdfGenerator, sourceAnalysisService
├── utils/                     # seedAdmin, validateEnv, auditLog
├── views/                     # EJS templates, views/admin/* for the admin panel
├── public/                    # static CSS/JS/images
├── tests/                     # Jest suite (unit + integration, in-memory Mongo)
├── api/index.js               # Vercel serverless entry point
├── netlify/functions/api.js   # Netlify Functions entry point
├── Dockerfile, docker-compose.yml
└── render.yaml, railway.json, vercel.json, netlify.toml
```

---

## Installation

### Prerequisites
- Node.js 18+
- A MongoDB instance (local, or [Atlas](https://www.mongodb.com/atlas) free tier)
- A [Groq API key](https://console.groq.com) (or a Gemini key if you prefer that provider)

### Setup

```bash
git clone <your-repo-url>
cd truthlens
npm install
cp .env.example .env
# edit .env — see the table below
npm run dev        # nodemon, auto-restart
# or
npm start           # production
```

On first boot, the app auto-creates an admin user in MongoDB from `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env` — no manual step required. You can also run it standalone:

```bash
npm run seed:admin
```

### Environment Variables

See [`.env.example`](./.env.example) for the full, commented list. Required at minimum:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Sign access/refresh tokens — use two different long random strings in production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Auto-seeded admin account |
| `GROQ_API_KEY` (or `GEMINI_API_KEY` + `AI_PROVIDER=gemini`) | AI analysis |

Recommended: `EMAIL_USER`/`EMAIL_PASS` (verification/reset emails), `NEWS_API_KEY` (live trending feed), `CLOUDINARY_*` (persistent image uploads — **required** if deploying to Vercel/Netlify, since local disk doesn't persist on serverless).

---

## Running Tests

```bash
npm test
```

Uses `mongodb-memory-server`, so no real database is needed — see [`TESTING_REPORT.md`](./TESTING_REPORT.md) for coverage details and how to extend it.

---

## Deployment

Supported out of the box: **Docker**, **Render**, **Railway**, **Vercel**, **Netlify**. Full instructions, trade-offs, and platform-specific caveats (especially around file uploads on serverless) are in [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md).

Quick start with Docker:

```bash
docker compose up --build
```

---

## Default Admin Login

After first boot, log in at `/login` with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env`. **Change the password immediately** via Admin → Users → Reset Password, or `/change-password` once logged in.

---

## License

MIT — see [`LICENSE`](./LICENSE) if included, or adapt as needed for your use case.
