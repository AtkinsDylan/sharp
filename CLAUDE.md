# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Sharp is

Sharp is a free-to-play MMA "pick'em" web app. Users sign up, browse upcoming UFC/MMA event cards, and pick a winner for each fight. When a fight result comes in, pending picks are auto-resolved and correct picks earn points (weighted by the odds and the pick type — e.g. picking a decision winner vs. a KO winner). A leaderboard ranks users by points, all-time or over the last 7 days.

## Repo layout

This is two independently deployed apps in one repo, plus a stale leftover:

- `sharp-backend/` — the real, actively developed Express API. Deployed as its own Render web service (`render.yaml`, `rootDir: sharp-backend`).
- `sharp-frontend/` — the React (Vite) SPA. Deployed as a static Render service.
- `src/` and `package.json` at the repo root — a stale copy of the backend frozen at the initial commit (`92926e5`). It has not been touched since and is not deployed (`render.yaml` only points at `sharp-backend/`). Don't edit it thinking it's live code — the working backend is `sharp-backend/src`.

## Stack

- **Frontend**: React 19 + Vite, React Router v7, Axios. Auth token kept in `localStorage` (`sharp_token`) and attached to every request via an Axios interceptor (`sharp-frontend/src/services/api.js`).
- **Backend**: Node.js + Express 5, `helmet` for security headers, `express-rate-limit` (global: 100 req/15min; auth routes: 10 req/15min), `zod` for request validation.
- **Database**: PostgreSQL, accessed via a raw `pg` `Pool` (`sharp-backend/src/db/pool.js`) — no ORM. SSL is enabled only when `NODE_ENV=production`.
- **Auth**: Supabase Auth. The backend calls `supabase.auth.signUp` / `signInWithPassword` and returns Supabase's JWT `access_token` to the client; `requireAuth`/`optionalAuth` middleware verify that JWT on each request via `supabase.auth.getUser(token)`. The app also keeps its own `users` row (id = Supabase auth user id) for points/stats.
- **Fight data sync**: despite the file being named `sharp-backend/src/services/apiSports.js` and env vars `API_SPORTS_KEY`/`API_SPORTS_BASE_URL` still existing, the sync code was switched to the free **ESPN** endpoint (`https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard`, see commit `f36c1c0`) and no longer calls API-Sports. Treat ESPN's scoreboard as the actual data source when touching this file.
- **Scheduling**: `node-cron`, wired up in `sharp-backend/src/services/cron.js`, started only when `NODE_ENV=production` (see `sharp-backend/src/index.js`).

## Database schema

Defined imperatively in `sharp-backend/src/db/migrate.js` (`CREATE TABLE IF NOT EXISTS`, no migration framework — edit this file and rerun it to change schema).

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK — same id as the Supabase auth user |
| `email` | `TEXT` | `NOT NULL UNIQUE` |
| `username` | `TEXT` | `UNIQUE` |
| `points` | `INTEGER` | default `0` |
| `total_picks` | `INTEGER` | default `0` |
| `correct_picks` | `INTEGER` | default `0` |
| `current_streak` | `INTEGER` | default `0` |
| `best_streak` | `INTEGER` | default `0` |
| `is_pro` | `BOOLEAN` | default `false` (unused today — roadmap item) |
| `created_at` | `TIMESTAMPTZ` | default `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | default `NOW()` |

### `events`
| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL` | PK |
| `api_sports_id` | `INTEGER` | `UNIQUE` — holds the ESPN event id despite the name |
| `name` | `TEXT` | `NOT NULL` |
| `date` | `TIMESTAMPTZ` | |
| `status` | `TEXT` | default `'upcoming'` |
| `created_at` | `TIMESTAMPTZ` | default `NOW()` |

### `fights`
| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL` | PK |
| `event_id` | `INTEGER` | FK → `events(id)`, `ON DELETE CASCADE` |
| `api_sports_id` | `INTEGER` | `UNIQUE` — holds the ESPN competition id |
| `fighter1_name` | `TEXT` | `NOT NULL` |
| `fighter1_record` | `TEXT` | |
| `fighter1_odds` | `INTEGER` | American odds; not currently populated by the ESPN sync |
| `fighter2_name` | `TEXT` | `NOT NULL` |
| `fighter2_record` | `TEXT` | |
| `fighter2_odds` | `INTEGER` | |
| `weight_class` | `TEXT` | |
| `card_position` | `TEXT` | `'Main Event' \| 'Co-Main' \| 'Main Card' \| 'Prelims'` |
| `status` | `TEXT` | default `'scheduled'`, → `'completed'` once resolved |
| `winner` | `TEXT` | fighter's full name, set on resolution |
| `method` | `TEXT` | not currently written by the sync job |
| `round_ended` | `INTEGER` | not currently written by the sync job |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | |
| Indexes | | `idx_fights_event_id (event_id)`, `idx_fights_status (status)` |

### `picks`
| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL` | PK |
| `user_id` | `UUID` | `NOT NULL`, FK → `users(id)`, `ON DELETE CASCADE` |
| `fight_id` | `INTEGER` | `NOT NULL`, FK → `fights(id)` |
| `fighter_selection` | `TEXT` | `'fighter1' \| 'fighter2'` |
| `fighter_name` | `TEXT` | `NOT NULL` — snapshotted fighter name at pick time |
| `pick_type` | `TEXT` | default `'ml'`; one of `ml, ko, dec, r1, r2, r3` |
| `odds_at_pick` | `INTEGER` | `NOT NULL` — snapshotted odds at pick time |
| `points_earned` | `INTEGER` | null until resolved |
| `status` | `TEXT` | default `'pending'` → `'correct' \| 'incorrect'` |
| `resolved_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ` | default `NOW()` |
| Indexes | | `idx_picks_user_id (user_id)`, `idx_picks_status (status)`, `idx_picks_fight_id (fight_id)` |

One pick per `(user_id, fight_id)` is enforced in application code (`sharp-backend/src/routes/picks.js`), not by a DB constraint.

## API routes

All mounted under `/api` in `sharp-backend/src/index.js`. "Auth" = `requireAuth` (401 if missing/invalid Supabase JWT) or `optionalAuth` (attaches `req.user` if a valid token is present, otherwise continues anonymously).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Liveness check, returns `{status:'ok', app:'Sharp API'}` |
| POST | `/api/auth/signup` | none (rate-limited: 10/15min) | Create Supabase auth user + app `users` row; rejects if `username` taken |
| POST | `/api/auth/login` | none (rate-limited: 10/15min) | Sign in via Supabase, returns `{token, user}` |
| POST | `/api/auth/logout` | none (rate-limited: 10/15min) | Calls `supabase.auth.signOut()` |
| GET | `/api/fights/events` | optional | List up to 10 soonest events, ordered by date |
| GET | `/api/fights/events/:eventId` | optional | Event detail + its fights, ordered Main Card → Co-Main → Prelims |
| GET | `/api/fights/:fightId` | optional | Single fight detail |
| POST | `/api/picks` | required | Submit a pick; validates fight is still `scheduled`, blocks duplicate picks, snapshots odds, returns `potential_points` |
| GET | `/api/picks` | required | Current user's picks (optionally filtered by `?status=`), newest first, max 50 |
| GET | `/api/picks/stats` | required | Current user's points/accuracy/streak, including computed `streak_multiplier` |
| GET | `/api/users/me` | required | Current user's profile + stats |
| PATCH | `/api/users/me` | required | Update `username` (must be unique) |
| GET | `/api/leaderboard` | optional | Top 50 by points; `?period=alltime` (default) or `?period=weekly` (points from correct picks in the last 7 days); marks `is_me` and computes `my_rank` if outside top 50 |
| POST | `/api/admin/sync` | **none** | Manually triggers `syncUpcomingEvents()`. No auth check — anyone who finds this route can trigger a sync |

## Cron jobs

Both registered in `sharp-backend/src/services/cron.js` via `startCronJobs()`, which only runs when `NODE_ENV=production` (see `sharp-backend/src/index.js`). In local dev they never fire automatically — trigger the underlying functions manually or hit `POST /api/admin/sync`.

1. **Daily fight card sync** — `0 6 * * *` (6:00 AM UTC daily). Calls `syncUpcomingEvents()` (`sharp-backend/src/services/apiSports.js`): fetches ESPN's UFC scoreboard, upserts into `events` and `fights` keyed on `api_sports_id`, and derives `card_position` from the competition's position in the card.
2. **Fight result resolution** — `*/15 * * * *` (every 15 minutes). Calls `syncResultsAndResolvePicks()`: finds `scheduled` fights whose event date has passed (max 20 at a time), checks ESPN's scoreboard for a completed result, marks the fight `completed` with a `winner`, resolves all `pending` picks for that fight (`correct`/`incorrect` + `points_earned`), and updates the picking user's `points`, `total_picks`, `correct_picks`, `current_streak`, `best_streak`.

Points for a correct pick are computed in `sharp-backend/src/routes/picks.js` from a base amount keyed off the odds bucket (heavier favorite → fewer points, bigger underdog → more) times a `pick_type` modifier (`ml` 1.0, `ko` 1.4, `dec` 0.7, `r1` 2.5, `r2` 2.0, `r3` 1.8) — a flat 10 points per correct pick, regardless of odds/type, when done from the cron resolution path.

## Local dev setup

```bash
# Backend
cd sharp-backend
npm install
npm run db:migrate   # creates tables (idempotent)
npm run db:seed      # optional: seeds a few sample events/fights
npm run dev           # nodemon src/index.js, http://localhost:3000

# Frontend
cd sharp-frontend
npm install
npm run dev            # vite, http://localhost:5173
```

Cron jobs don't start in dev (`NODE_ENV !== production`); call `POST http://localhost:3000/api/admin/sync` to manually pull fight data, or run the sync functions directly.

### Required environment variables

**`sharp-backend/.env`**
```
PORT=3000
NODE_ENV=development
DATABASE_URL=              # Postgres connection string
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
JWT_SECRET=                 # present in env but not currently read by any backend code
API_SPORTS_KEY=              # present in env but unused — sync now hits ESPN, not API-Sports
API_SPORTS_BASE_URL=         # same as above, unused
ALLOWED_ORIGINS=             # comma-separated list of allowed CORS origins, e.g. http://localhost:5173,http://localhost:5174
```

**`sharp-frontend/.env`**
```
VITE_API_URL=                # backend base URL, e.g. http://localhost:3000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.env` files in both apps are git-ignored — never commit real values.
