# Database Documentation

MongoDB via Mongoose. Nine collections, described below with their key fields, relationships, and indexes.

## Entity Relationship Overview

```
User ──1:N── NewsHistory ──1:N── Report (PDF downloads)
User ──1:N── ContentReport (as reporter)
User ──1:N── TrendingNews (as createdBy / approvedBy)
User ──1:N── AuditLog (as actor)
User ──1:N── AIRequestLog (as triggeredBy)
NewsHistory / TrendingNews ──referenced by── ContentReport (polymorphic via targetType/targetId)
Settings — singleton (key: 'global')
Category — flat lookup list for news categories
```

## `User`
| Field | Type | Notes |
|---|---|---|
| name, email | String | email unique, lowercased |
| password | String | bcrypt-hashed, `select: false` by default |
| role | enum `user, admin` | default `user` |
| status | enum `active, suspended, banned` | **added this session** — drives login/route access |
| lastLogin | Date | set on successful login |
| failedLoginAttempts | Number | incremented on bad password |
| tokenVersion | Number | **added this session** — bump to invalidate all outstanding JWTs for this user |
| isVerified | Boolean | email verification flag |
| resetPasswordToken / resetPasswordExpire | String / Date | shared by both password-reset and email-verify flows |
| photo | String | Cloudinary URL or local `/uploads/...` path |
| history (virtual) | → `NewsHistory` | `ref: 'user'`, populated on demand |
| bookmarks (virtual) | → `NewsHistory` | filtered by `bookmarked: true` |

Indexes: `email` (unique), `role`, `status`.

## `NewsHistory`
User's analysis records: `title`, `content`, `url`, `prediction`, `confidence`, `explanation`, `category`, `bookmarked`, `user` (ref).

## `TrendingNews`
Curated news items shown on the public trending page once published.
| Field | Notes |
|---|---|
| status | enum `draft, approved, rejected, published, unpublished` — **added this session**, moderation workflow |
| featured | Boolean — **added this session** |
| createdBy / approvedBy / approvedAt | ref `User` / Date — **added this session** |

Indexes: `{status, createdAt}`, `category`, `featured`.

## `Category`
Flat list: `name` (unique), `description`.

## `Report`
PDF-download records for a user's own analysis (distinct from `ContentReport` — see below). Fields: `user`, `newsHistory` (ref), `pdfPath`, `createdAt`.

## `ContentReport` — **new this session**
User-submitted moderation flags ("this analysis/article looks wrong"), feeding the admin Reports tab.
| Field | Notes |
|---|---|
| reporter | ref `User` |
| targetType | `NewsHistory` \| `TrendingNews` |
| targetId | polymorphic ref (`refPath: 'targetType'`) |
| reason | `incorrect_verdict, spam, offensive, misleading, other` |
| status | `pending, reviewed, resolved, dismissed` |
| reviewedBy / reviewedAt / adminNote | set when an admin actions the report |

Index: `{status, createdAt}`.

## `AuditLog` — **new this session**
Append-only security/activity trail powering the admin Security tab.
| Field | Notes |
|---|---|
| actor / actorEmail / actorRole | who did it (actor may be null for e.g. an unrecognized login email) |
| action | enum — login/logout, register, password events, role/status changes, news/report/settings changes, admin seed |
| targetType / targetId | what it was done to |
| details | `Mixed` — free-form context (e.g. `{ from: 'user', to: 'admin' }`) |
| ip / userAgent | captured from the request |

Indexes: `createdAt` desc, `{action, createdAt}`, `{actor, createdAt}`.

## `AIRequestLog` — **new this session**
One row per `aiService.analyzeNews()` call (success or failure), powering the admin AI Management tab.
| Field | Notes |
|---|---|
| provider | `groq` \| `gemini` |
| status | `success` \| `error` |
| verdict / confidence | from a successful analysis |
| latencyMs | request duration |
| errorMessage | truncated to 500 chars on failure |
| triggeredBy | ref `User`, null for background/trending-ingestion calls |
| source | `analyze` \| `trending` \| `other` |

Indexes: `createdAt` desc, `{status, createdAt}`.

## `Settings` — **new this session**
Singleton document (`key: 'global'`, upserted) for live-editable site configuration: `siteName`, `siteLogo`, contact info, `aiProvider`, `maintenanceMode` (+ message), `registrationEnabled`. Secrets (API keys, SMTP credentials) intentionally stay in `.env` and are never duplicated here.

---

## Migration Notes

Fields added to existing collections this session (`User.status/tokenVersion/lastLogin/failedLoginAttempts`, `TrendingNews.status/featured/approvedBy/approvedAt`) use Mongoose schema defaults, so **no manual migration script is required** — existing documents simply get the default value the first time they're read/saved. The one exception: the public trending page query explicitly treats "no `status` field" as equivalent to `published` (`$or: [{status: 'published'}, {status: {$exists: false}}]`) so pre-existing trending articles don't silently disappear after this upgrade.
