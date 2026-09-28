# Witness Relay (web)

Next.js 16 + TypeScript app for the Ethar Relief brandathon prototype.
Engineering plan: [`../BUILD-PLAN.md`](../BUILD-PLAN.md) · design system: [`../witness-relay-design/theme.css`](../witness-relay-design/theme.css)

## Setup

1. **Supabase** — create a project (free tier), then run
   [`../supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql)
   in the SQL editor. That creates all tables, RLS policies and the
   `event_chain` / `event_lane_chain` stat views.
2. **Env** — copy `.env.example` to `.env.local` and fill in from
   Supabase → Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, never shipped to the client)
   - `DONATION_BASE_URL` — LaunchGood campaign URL; the ref code is appended
3. **Seed** — `npx tsx scripts/seed.ts` loads sample lanes, relayers and
   3 events (2 approved, 1 in review), all flagged `is_demo`.
4. **Run** — `npm run dev`, open http://localhost:3000.
   Health check: `curl localhost:3000/api/health` → `{"ok":true,"db":"ok"}`.

## Layout

```
app/
  page.tsx            / (live feed lands here in Layer 3)
  api/health/route.ts health + DB connectivity probe
components/
  Brand.tsx           seal, brand mark, top bar
  ui.tsx              Chip, Stamp, Dateline, SectionLabel, StatTile, Card
lib/supabase/server.ts  service-role (writes) + anon (reads) clients
scripts/seed.ts       sample-data loader (tsx)
../supabase/migrations/0001_init.sql
```

## Rules of the house

- Nothing publishes without an `editorial_decisions` row from a human.
- "Confirmed" donations come only from payment references or reconciliation —
  tracked clicks are always labeled as clicks.
- Approved field imagery only; never AI-generated imagery of affected people.
