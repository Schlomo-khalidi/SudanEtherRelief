# SudanEtherRelief — Witness Relay

Verified Sudan & East Africa news, human-approved, relayed through communities
via tracked links, ending in attributed donations to **Ethar Relief**.

Ethar Relief Brandathon · HabibiTech Summit 2026

## Repo map

| Path | What it is |
|---|---|
| [`BUILD-PLAN.md`](./BUILD-PLAN.md) | **Start here** — layered engineering plan with checkboxes, schedule, risks |
| [`web/`](./web) | Next.js 16 + TypeScript app (Layer 0 scaffolded, building clean) |
| [`supabase/migrations/`](./supabase/migrations) | Full schema: 12 tables, RLS, `event_chain` stat views |
| [`design/`](./design) | UI mockups (HTML + 2× renders), design system, team walkthrough |

## Quick start

```bash
cd web
npm install
cp .env.example .env.local   # fill from Supabase → Project Settings → API
# run supabase/migrations/0001_init.sql in the Supabase SQL editor
npx tsx scripts/seed.ts      # sample data, flagged is_demo
npm run dev                  # http://localhost:3000
```

Full setup steps: [`web/README.md`](./web/README.md).

## House rules

- Nothing publishes without a human editorial decision.
- "Confirmed" donations come only from payment references or reconciliation —
  tracked clicks are always labeled as clicks.
- Approved field imagery only; never AI-generated imagery of affected people.
