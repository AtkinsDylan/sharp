# Sharp · MMA Pick'em

> Free-to-play MMA prediction app. Pick fight winners, earn points, climb the leaderboard.

**Live:** [sharp-frontend.onrender.com](https://sharp-frontend.onrender.com)

---

## What it does

Users sign up, browse upcoming UFC/MMA fight cards, and pick a winner for each fight. Points are awarded automatically when results come in. A live leaderboard tracks rankings across all users.

---

## Tech Stack

### Frontend
- React (Vite)
- React Router
- Axios
- Hosted on Render

### Backend
- Node.js + Express
- PostgreSQL (via `pg` pool)
- Supabase Auth (JWT)
- node-cron for scheduled jobs
- Hosted on Render

### External APIs
- **API-Sports** — live MMA fight data, results, and event schedules
- **Supabase** — authentication and user management

---

## Key Features

- **Auth** — Signup/login via Supabase with JWT, protected routes
- **Fight cards** — Synced daily from API-Sports via cron job
- **Pick'em** — Submit one pick per fight, locked once event starts
- **Auto-resolution** — Cron job checks results every 15 minutes and resolves all pending picks
- **Points & streaks** — Correct picks earn points; streaks tracked per user
- **Leaderboard** — Ranked by points across all users

---

## Architecture

```
Frontend (React)
    │
    └── REST API (Express)
            │
            ├── PostgreSQL  — users, fights, events, picks
            ├── Supabase    — authentication
            └── API-Sports  — fight data (cron synced)
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Auth ID, username, points, streaks |
| `events` | MMA events synced from API-Sports |
| `fights` | Individual fights per event, odds, result |
| `picks` | User predictions, resolved on fight completion |

---

## Local Setup

```bash
# Backend
cd sharp-backend
npm install
cp .env.example .env   # add your keys
npm run dev

# Frontend
cd sharp-frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:3000
npm run dev
```

### Required environment variables

**Backend**
```
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
API_SPORTS_KEY=
API_SPORTS_BASE_URL=
NODE_ENV=development
```

**Frontend**
```
VITE_API_URL=http://localhost:3000
```

---

## Roadmap

- [ ] Fighter photos and winner visuals
- [ ] AI fight predictions
- [ ] Mobile app (React Native / Expo)
- [ ] Pro tier with Stripe billing

---

## Author

Built by Dylan — portfolio project demonstrating full-stack development with React, Node.js, PostgreSQL, and third-party API integration.
