# CodeCranium Backend

REST API for the CodeCranium learning platform (Express 5 + MongoDB/Mongoose + JWT).

## Setup

```bash
npm install
cp .env.example .env   # then fill in MONGODB_URI and JWT_SECRET
npm run seed           # optional: load demo catalog + users (destructive!)
npm run dev            # http://localhost:3001
```

The frontend should set:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Seeded logins (`npm run seed`)

| Account | Password | Role |
|---|---|---|
| admin@codecranium.com | admin123 | admin |
| sarah@codecranium.com | sarah123 | instructor |
| marcus@codecranium.com | marcus123 | instructor |
| alex@example.com | learner123 | learner |

## Response envelope

Every endpoint returns `{ success: true, data: … }` or
`{ success: false, message, errors? }`. Send the JWT as
`Authorization: Bearer <token>` (the frontend's axios interceptor already does).

## Endpoints

### Auth — `/api/v1/auth` (rate-limited: 20 req / 15 min)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | `{ name?, email, password }` → `{ user, token }` |
| POST | `/login` | — | `{ email, password }` → `{ user, token }` |
| GET | `/me` | ✅ | Current user (re-hydrate stores on startup) |
| POST | `/logout` | ✅ | Stateless signal |

### Courses — `/api/v1/courses`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Catalog. Query: `q, category, difficulty, price=free\|paid, sort=popular\|rating\|newest\|price-low\|price-high, page, limit` |
| GET | `/:slug` | optional | Course detail (drafts visible to owner/admin only) |
| GET | `/:slug/lessons/:lessonSlug` | optional | Lesson with content — preview lessons public, rest require enrollment |
| GET | `/:slug/lessons/:lessonSlug/comments` | — | Approved comments, threaded |

### Enrollments & progress — `/api/v1/enrollments` (all ✅)
| Method | Path | Description |
|---|---|---|
| GET | `/` | My enrollments with derived progress + course cards |
| POST | `/` | `{ courseId }` — enroll |
| POST | `/:courseId/complete-lesson` | `{ lessonId, lessonSlug? }` → XP awarded, streak updated, certificate on course completion |

### Me — `/api/v1/users` (all ✅)
| Method | Path | Description |
|---|---|---|
| PATCH | `/me` | `{ name?, avatar?, bio?, payoutAccount? }` |
| GET | `/me/dashboard` | User + enrollments + certificates + stats in one call |
| GET | `/me/certificates` | My certificates |

### Comments — `/api/v1/comments` (all ✅)
| Method | Path | Description |
|---|---|---|
| POST | `/` | `{ courseId, lessonSlug, content, parentId? }` — spam-flagged comments go to moderation |
| POST | `/:id/like` | Toggle like |

### Learning paths — `/api/v1/learning-paths`
| Method | Path | Description |
|---|---|---|
| GET | `/` | All paths |
| GET | `/:slug` | Path + full course cards |

### Instructor — `/api/v1/instructor` (✅ role: instructor/admin)
| Method | Path | Description |
|---|---|---|
| GET | `/overview` | Profile + headline stats |
| GET | `/courses` | My courses incl. drafts |
| POST | `/courses` | Create (starts as draft) |
| GET / PATCH / DELETE | `/courses/:id` | Editor read / update / delete (auto-archives if it has students) |
| PATCH | `/courses/:id/status` | `{ status: published\|draft\|archived }` |
| GET | `/analytics` | Per-course completion / revenue |
| GET | `/revenue` | 12-month earnings + payout history |
| GET | `/students` | Recent students across my courses |

### Admin — `/api/v1/admin` (✅ role: admin)
| Method | Path | Description |
|---|---|---|
| GET | `/stats` | Platform totals |
| GET | `/analytics/revenue` | Monthly revenue + signups (12 mo) |
| GET | `/activity` | Recent activity feed |
| GET | `/students` | Query: `q, status, plan, page, limit` |
| PATCH | `/students/:id` | `{ status?, plan?, role? }` (ban / upgrade / promote) |
| GET | `/courses` | All courses, any status |
| GET | `/comments` | Moderation queue (`?status=pending`) |
| PATCH | `/comments/:id` | `{ status: approved\|rejected }` |

### Misc
- `GET /health` — liveness check

## Architecture

```
server.js            → connect DB, listen
app.js               → middleware (helmet, cors, rate-limit) + route mounting
src/
  config/            → env validation (zod), db connection
  models/            → Mongoose schemas + toPublic() shapers matching frontend types
  validators/        → zod request schemas
  middleware/        → protect / optionalAuth, requireRole, validate, errorHandler
  services/          → business logic
  controllers/       → thin req/res adapters
  routes/            → routers per domain
  seed/              → npm run seed
```

Gamification: lessons award XP (article/video 50, quiz 75, challenge 100),
finishing a course adds a 500 XP bonus + certificate; daily activity maintains
the streak counter.
