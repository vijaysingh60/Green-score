# GREENScore Hyderabad

> **Measure. Verify. Improve.**
> Understand how sustainable your building is and discover practical ways to improve it.

A **hackathon MVP** that scores the sustainability of buildings in Hyderabad. Owners submit building data and
instantly get a rule-based **preliminary score**, an advisory **ML score**, **recommendations** and a **what-if
simulator**. An **admin** reviews the evidence and publishes the official **Verified Green Score**, which then
shows up on the public map.

> The 100-point framework is a prototype methodology. It is **not** an official government or IGBC certification.
> Buildings marked **Demo** are sample data, not real verified assessments.

## The four scores (never mixed up)

| Score | Produced by | Status |
|---|---|---|
| Preliminary | deterministic rules (`packages/shared`) | automatic, "pending human verification" |
| ML predicted | Python/scikit-learn service (`apps/ml`) | **advisory, never final** |
| Projected | what-if simulator | a projection, not stored as the building's score |
| **Verified (final)** | **a human admin** | the only official score; shown on the public map |

They live in separate fields, are labelled differently in the UI, and the final one can only be written by the admin
verify action.

## Quick start

Requirements: Node 22+, npm, MongoDB, Python 3.10+.

```bash
cp .env.example .env            # defaults work for local dev
npm install

npm run db:local                # terminal 1: local MongoDB (Homebrew mongod). Or: docker compose up -d mongo
npm run db:seed                 # demo Hyderabad buildings (all flagged isDemo)
npm run ml:setup && npm run dev:ml   # terminal 2: ML service on :8001 (optional)
npm run dev                     # terminal 3: API :4000 + web :3000
```

Open <http://localhost:3000>. Admin: <http://localhost:3000/admin>, passcode `greenscore-admin` (see `.env`).

The ML service is optional: if it is down, the API falls back to a clearly labelled **simulated** prediction.

> **Tip:** don't keep the repo in an iCloud-synced folder (e.g. `~/Desktop`). `node_modules` makes sync, and every
> tool that reads it, extremely slow.

## The demo flow

1. Open the site: **Hyderabad map** with demo buildings (dashed ring = demo data; high scorers are haloed).
2. Click a building, then **View building**: score ring, breakdown, carbon estimate, recommendations, history, what-if.
3. **Add Your Building** (use *Fill with sample data*): 6-step form with a live score preview.
4. Submit: **preliminary score**, **ML prediction** (advisory), **recommendations**, status *pending human verification*.
   The building is **not** on the public map yet.
5. **Admin**: enter the passcode, open the pending submission, review the evidence, optionally adjust the score,
   **Verify & publish** (or Reject).
6. Back on the map: the building appears with its **Verified Green Score**.
7. **Admin → ML & feedback**: the ML-vs-human difference was stored (no automatic retraining).

## Layout

```
apps/
  web/   Next.js 16 + Tailwind 4 + Leaflet + Recharts    (src/app = pages, src/components, src/lib)
  api/   Express 5 + Mongoose                              (routes, services, models, validators)
  ml/    FastAPI + scikit-learn demo model (synthetic data)
packages/
  types/    shared TS types + enums (single source of truth for the API contract)
  shared/   scoring config + engine, parameter registry, improvements, carbon, demo data
  ui/       reusable React components + design tokens
docs/       architecture, api-contract, scoring, ml-workflow
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + web with reload |
| `npm run dev:ml` / `npm run ml:setup` | run / set up the ML service |
| `npm run db:local` / `npm run db:seed` | local MongoDB / seed demo data |
| `npm run check` | typecheck + lint + tests across all workspaces |
| `npm run build` | production build of API and web |

## What is intentionally *not* here (MVP)

Real authentication (admin uses a shared demo passcode), file uploads (documents are mock records), automatic ML
retraining, Docker/CI, large datasets. See `docs/architecture.md` for what to harden first.

## Docs

- [docs/architecture.md](docs/architecture.md): structure, data model, decisions
- [docs/api-contract.md](docs/api-contract.md): endpoints
- [docs/scoring.md](docs/scoring.md): the 100-point framework and how to change it
- [docs/ml-workflow.md](docs/ml-workflow.md): how the ML score is produced and used
