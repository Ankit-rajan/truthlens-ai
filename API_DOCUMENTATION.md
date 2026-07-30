# API Documentation

Base URL: `http://localhost:5000` (or your deployed domain). All request/response bodies are JSON unless noted.

**Auth:** Most routes require a valid access token, sent either as an httpOnly `token` cookie (set automatically on login/register) or an `Authorization: Bearer <token>` header. Access tokens expire in 15 minutes (`JWT_ACCESS_EXPIRE`); use `POST /api/auth/refresh-token` to get a new one via the httpOnly `refreshToken` cookie (7 days, `JWT_REFRESH_EXPIRE`).

---

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create an account. Body: `{ name, email, password }`. Sends a verification email (non-blocking). |
| POST | `/login` | — | Body: `{ email, password }`. Returns `{ token, user }`, sets `token`/`refreshToken` cookies. Fails 403 if account is banned/suspended. |
| POST | `/refresh-token` | refresh cookie | Rotates the access token using the httpOnly refresh cookie. |
| GET | `/logout` | — | Clears both cookies. |
| GET | `/me` | ✅ | Current user profile + populated history. |
| PUT | `/profile` | ✅ | Update `{ name, email }`. |
| POST | `/change-password` | ✅ | Body: `{ currentPassword, newPassword }`. Bumps `tokenVersion` (logs out other sessions). |
| POST | `/forgot-password` | — | Body: `{ email }`. Always returns success (doesn't leak whether the email exists). |
| POST | `/reset-password` | — | Body: `{ token, newPassword }`. Token from the reset email, valid 10 minutes. |
| GET | `/verify-email?token=` | — | Verifies email, redirects to `/login?verified=true`. |
| POST | `/upload-photo` | ✅ | `multipart/form-data`, field `photo`. Uses Cloudinary if configured, else local `/uploads`. |

## News — `/api/news`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/detect` | ✅ | Body: `{ title?, content, url? }`. Runs AI analysis, saves to history, logs to `AIRequestLog`. |
| GET | `/history` | ✅ | Current user's analysis history. |
| DELETE | `/history/:id` | ✅ | Delete one history entry. |
| GET | `/history/export` | ✅ | CSV export of history. |
| POST | `/bookmark/:id` | ✅ | Toggle bookmark on a history entry. |
| GET | `/report/:id` | ✅ | Generate/download a PDF report for a history entry. |
| POST | `/report/:id` | ✅ | Flag a history entry for admin review. Body: `{ reason, message? }`. `reason` ∈ `incorrect_verdict, spam, offensive, misleading, other`. Creates a `ContentReport`. |

## Trending (public feed) — `/api/trending`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Live NewsAPI-sourced trending feed, AI-scored on the fly. Query: `search`, `category`, `limit`. |
| GET | `/:id` | — | A single curated (DB) trending item by id. |

> Note: this is the **public, live** feed. Curated/moderated trending content lives in the admin News API below and is exposed to end users at `GET /trending` (the server-rendered page), filtered to `status: 'published'`.

## Admin — `/api/admin` (all routes require `role: 'admin'` + active status)

### Dashboard
| Method | Path | Description |
|---|---|---|
| GET | `/stats` | Totals, today's counts, fake/real breakdown, AI stats, system health. |
| GET | `/analytics` | Monthly analyses, daily users/analyses (30d), fake-vs-real, monthly growth. |

### Users
| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/users` | `?search=&role=&status=&page=&limit=` | Paginated, filterable user list. |
| GET | `/users/:id` | — | Full profile + history + bookmarks + their content reports. |
| PUT | `/users/:id` | `{ name?, email? }` | Edit basic info. |
| PUT | `/users/:id/role` | `{ role }` | `user`/`admin`. Blocked if it would demote the last admin, or self-demote. |
| PUT | `/users/:id/status` | `{ status }` | `active`/`suspended`/`banned`. Blocked for self or an active admin (demote first). |
| PUT | `/users/:id/reset-password` | `{ newPassword }` | Admin-initiated reset; invalidates the user's existing sessions. |
| DELETE | `/users/:id` | — | Blocked for self or the last remaining admin. |

### News (curated `TrendingNews`)
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/news` | `?status=&category=&search=` | List with filters. |
| POST | `/news` | `{ title, category, description?, content?, prediction?, source?, image?, featured? }` | Created as `status: 'draft'`. |
| PUT | `/news/:id` | any of the above | Edit fields. |
| PUT | `/news/:id/status` | `{ status }` | `draft/approved/rejected/published/unpublished`. Stamps `approvedBy`/`approvedAt` on approve/publish. |
| DELETE | `/news/:id` | — | |

### Categories
| Method | Path | Body |
|---|---|---|
| GET | `/categories` | — |
| POST | `/categories` | `{ name, description? }` |
| DELETE | `/categories/:id` | — |

### Reports (moderation)
| Method | Path | Body |
|---|---|---|
| GET | `/reports` | `?status=` |
| PUT | `/reports/:id` | `{ status, adminNote? }` — status ∈ `pending/reviewed/resolved/dismissed` |
| DELETE | `/reports/:id` | — |

### AI Management
| Method | Path | Description |
|---|---|---|
| GET | `/ai/stats` | Requests today, success/error rate, avg confidence, provider breakdown, last 10 errors. |

### Settings
| Method | Path | Body |
|---|---|---|
| GET | `/settings` | — |
| PUT | `/settings` | Any of `siteName, siteLogo, contactEmail, contactPhone, supportAddress, aiProvider, maintenanceMode, maintenanceMessage, registrationEnabled` |

### Security
| Method | Path | Description |
|---|---|---|
| GET | `/security/logs` | `?action=&page=&limit=` — paginated audit log + today's login/failed-login summary. |

---

## Response Shape

Success: `{ "success": true, ...data }`
Error: `{ "success": false, "message": "..." }` with an appropriate HTTP status (400/401/403/404/500).

## Rate Limiting

`/api/*` is globally rate-limited (1000 req / 15 min / IP). Auth routes (`/api/auth/login`, `/register`, `/refresh-token`, `/forgot-password`, `/reset-password`) additionally go through `authLimiter` (see `middleware/rateLimiter.js`) for brute-force protection.

## Health Check

`GET /health` — no auth, returns `{ status: 'ok', uptime, timestamp, dbState }`. Used by Docker/Render/Railway health probes.
