# Witness Relay — Engineering Build Plan

**Mission:** verified Sudan/East-Africa news in → human-approved Witness Cards out → relayed through communities via tracked links → attributed, confirmed donations to Ethar Relief.

**Submission:** product link + 30–60s highlight video, due **Friday Sept 25, 5:00 PM ET** at habibi.tech/brandathon. No pitch deck.

**Repo:** [github.com/Schlomo-khalidi/SudanEtherRelief](https://github.com/Schlomo-khalidi/SudanEtherRelief) — branch `main`, pushed over SSH. (Note: HTTPS pushes of large payloads 408 on this connection — always push via SSH.)

**🟢 LIVE:** [https://sudanetherrelief.vercel.app](https://sudanetherrelief.vercel.app) — deployed via CLI (`vercel --prod` from `web/`, token-based). All 11 production env vars set; daily ingest cron active; fonts self-hosted so builds are deterministic. Deploy updates: `cd web && npx vercel --prod`.

**How to use this file:** work top-to-bottom. Each layer lists what to *use*, the *build* tasks (check them off as you go), and a *done-when* gate — do not start the next layer until the gate passes. Layers are dependency-ordered; Track B runs in parallel from day 1.

---

## Where we are now

| Layer | State |
|---|---|
| **L0 Foundations** | ✅ Scaffolded & building clean. GitHub live; ⬜ Vercel + Sentry open. |
| **L1 Data core** | ✅ **Live** — Supabase wired, seeded (4 lanes, 5 relayers, 3 events), RLS verified both ways. |
| **L2 Ingest/AI** | ✅ **Live** — Gemini (`gemini-3.8-flash` via your key, with retry/fallback chain), ReliefWeb + AllAfrica adapters verified (GDELT blocked on this home network — will work on Vercel), clustering, source-ID-enforced drafting (claims without sources are dropped in code). **First live run drafted 4 real events, now awaiting Gasser's approval in the queue.** Cron every 30 min via `vercel.json` + manual Run-ingest button. |
| **L3 Public product** | ✅ **Live on dev** — feed with real aggregates, event pages (claims + source pills + approval line + field photos), chain board, OG + story card generators, `/r/[code]` view tracking (verified counting), Give-click route ready for the donation URL. |
| **L4 Newsroom** | ✅ **Live** — password gate (editor: Gasser), review queue with risk flags, approve/edit/pause/reject writing the decision log, publishing checklist, CSV reconciliation importer. **Verified end-to-end**: approved the Khartoum draft in the UI → it published; imported a $25 donation via CSV → confirmed on the public chain. |
| **L5 Relay hub** | ✅ **Live** — signup + lane picker, personal tracked links (with QR), share kits EN+AR (WhatsApp, IG caption, 15s script), auto-generated OG + story cards with field photos, relayer dashboard with per-link chains. Founding cohort seeded: Joshua, Allan, Gasser B., Newton, Linda. **Verified**: joined as Joshua → generated kit → opened `/r/KHRBGN` → view counted on his dashboard. Imagery attached to all 3 events as high-res originals w/ credit (confirm Ethar clearance). 0002 hardening migration applied & verified (drafts invisible to public views). |
| **L7 Impact board** | ✅ **Live at `/impact`** — global totals bar, events-on-the-record table, top-lanes aggregation, opt-in relayer leaderboard. Every figure aggregates the `event_chain`/`event_lane_chain` SQL views + per-link tracking rows; confirmed vs pending vs clicks labeled throughout. |
| **L6 Money path** | ✅ **FULLY LIVE — real LaunchGood campaign wired (`DONATION_BASE_URL` set on prod).** Give buttons route attributed donors to Ethar's live campaign with `?ref=CODE`; clicks logged; confirmations via CSV reconcile (proven $25), webhook (proven $30), Stripe sandbox (proven $25) — Zamzam at **$80 confirmed · 3 gifts**, now attributed to relayer KHRBGN. Remaining: Ethar's donation-ask copy per new event + their export format for reconciliation. |
| **L8 Polish** | ✅ **Live** — Sentry wired across client/server/edge + cron error alerting (test event **delivered & verified**, id `5a79527e…`), `/r/` rate-limited (30/min per IP), branded 404, favicon seal, mobile nav pass, EN/AR kits done in L5. ⬜ Optional nice-to-have: formal Lighthouse audit at deploy time. |
| **Design** | ✅ Final — in `design/` |

**Live demo path (works right now):** `/` feed → `/event/zamzam-famine-confirmed` → `/r/ZA2GLP` logs a view and redirects with attribution. Chain numbers on the event page move in real time.

**Immediate next actions:** ① Gasser reviews + approves/edits the **4 live AI drafts** in `/admin` (they're real current news — this is the editorial moment) · ② Ethar/LaunchGood conversation → campaign URL for `DONATION_BASE_URL` **and** donation-copy sign-offs for the live events · ③ activate the 5 relayers with their kits (post this week) · ④ Vercel account when ready to deploy — I'll hand over the exact env list; cron + public site go live together · ⑤ optional: Sentry DSN for L8.

---

## What the judges score → what builds it

| Criterion | Won by | Layers |
|---|---|---|
| **Originality** — fresh, not buyable | Relay lanes + per-link provenance chain | L5, L7 |
| **Reach** — provable people reached | Real relayers + tracked views | L5, Track B |
| **Product** — collects & publishes, works | Live ingest → approval → publish loop | L0–L4 |
| **Impact** — donations triggered, attention | Confirmed-donation attribution, honestly labeled | L6, L7 |

**Non-negotiables (never cut for time):** publish only source-backed, human-approved stories; "confirmed" only from payment reference or reconciliation; approved field imagery only — never AI-generated images of affected people.

---

## Track A — Engineering layers

### Layer 0 — Foundations & deployment
**Goal:** an empty but deployed, branded app that auto-deploys on push.
**Use:** Next.js 15 (App Router, TypeScript strict) · Vercel · GitHub · Supabase project · Sentry · design tokens from `witness-relay-design/theme.css`.

- [x] GitHub repo live: [SudanEtherRelief](https://github.com/Schlomo-khalidi/SudanEtherRelief) (`main`, auto-push ready)
- [ ] Vercel project connected to the repo; auto-deploy from `main`
- [x] Scaffold Next.js app; port design system (`web/app/globals.css` tokens + `components/ui.tsx`: Button, Chip, Stamp, Card, StatTile)
- [ ] Create Supabase project; set env vars in Vercel + local `.env` (`.env.example` ready)
- [x] `/api/health` route returns `{ ok: true }` + DB connectivity probe
- [ ] Sentry installed; a test error shows in the dashboard

**Done when:** the deployed URL shows a token-styled page and Sentry captures a test error.
*Scaffold status: `web/` builds clean (`npm run build`) — Next 16, React 19, design system ported.*

### Layer 1 — Data core (the contract)
**Goal:** the full schema exists, is protected, and demo-seeds cleanly.
**Use:** Supabase migrations (SQL) · generated types for `supabase-js` · Zod for LLM-output validation.

- [x] Migrations for the tables: `sources, events, story_packs, relay_lanes, relayers, lane_members, share_links, link_views, donation_clicks, donation_attributions, editorial_decisions, assets` → `supabase/migrations/0001_init.sql` (clicks split into `link_views` = tracked /r/ opens, `donation_clicks` = Give taps)
- [x] Event lifecycle: `draft → in_review → approved → paused → archived`
- [x] `donation_attributions.method` = `launchgood_ref | csv_reconcile | webhook`; `status` = `pending | confirmed`
- [x] Indexes: `share_links.code` unique; views/clicks by `(share_link_id, ts)` and `event_id`; `events(status)`
- [x] RLS: public reads **approved events only**; writes via service role; aggregates exposed via `event_chain` / `event_lane_chain` views
- [x] Seed script run against the project (`npx tsx scripts/seed.ts` — re-runnable, cleans its own sample rows first)
- [ ] Typed DB client generated and committed

**Done when:** seed loads cleanly and an anonymous write is rejected by RLS.

### Layer 2 — Ingest & AI drafting
**Goal:** the machine produces review-ready drafts from real, current sources.
**Use:** Vercel cron (`vercel.json`, every 30 min) · `rss-parser` · one LLM with structured JSON output · embeddings for dedup/clustering.

- [ ] Source adapters: Radio Dabanga, Sudan Tribune, ReliefWeb, UN News, GDELT (RSS/official feeds only — credit + link out)
- [ ] `/api/cron/ingest`: fetch → normalize `{title, url, published_at, outlet, snippet}` → dedupe vs last N days
- [ ] Cluster: embed title+location; group at cosine ≥ ~0.82 into event candidates
- [ ] Draft: headline, 3–5 claims **each carrying sourceIds**, explainer, donation hook — Zod-validated; **reject any payload with a claim lacking a source**
- [ ] Write `story_packs` draft + `editorial_decisions(auto_draft)`; queue flag "needs review"
- [ ] Field-report form → same pipeline (Ethar staff memos become sources)
- [ ] Idempotent runs; failures breadcrumb to Sentry

**Done when:** a cron run produces ≥ 3 review-ready drafts grounded in real sources.

### Layer 3 — Public product (feed + event + cards)
**Goal:** judges can click a live feed and a fully sourced event page.
**Use:** server components + revalidation · `next/og` (Satori) for dynamic share images.

- [x] `/` live feed: approved events, live stats bar (aggregate query), filter chips, **Relay this** CTA per card
- [x] `/event/[slug]`: claims with source pills, sources card with quotes, Ethar-approved donation ask, share options
- [x] Chain board component: event → lanes → relayers → views → clicks → **confirmed $** (fed by the `event_chain` / `event_lane_chain` SQL views)
- [x] `/event/[slug]/opengraph-image` — Satori template with Fraunces/Plex Mono TTF loading (EN live; AR variants land with the Layer 5 kits)
- [x] OG/meta tags on event pages; loading/empty/error states
- [x] *Pulled forward from L5:* `/r/[code]` tracked redirect logs attributed views; `/api/track/click` logs Give taps and forwards `?ref=` once `DONATION_BASE_URL` is set

**Done when:** an approved event renders publicly and its WhatsApp link preview shows the generated card.

### Layer 4 — Editorial newsroom
**Goal:** nothing publishes without a human decision; the audit trail is the feature.
**Use:** Supabase Auth (magic link, single staff user) · server actions.

- [ ] `/admin` behind auth middleware
- [ ] Review queue: drafts with confidence, source count, risk flags (imagery pending, single-source claim)
- [ ] Review detail: editable headline, claims + source pills, imagery with credit/clearance, **Ethar donation copy locked**
- [ ] Decisions — approve → publish, request edit, pause, reject — every action writes `editorial_decisions`
- [ ] Publishing checklist block (claims sourced / copy locked / imagery cleared / AR kit / lane notifications)
- [ ] Reconciliation screen: import CSV → `donation_attributions` confirmed (`method = csv_reconcile`)

**Done when:** an unapproved event is invisible publicly; every decision appears in the log.

### Layer 5 — Relay & attribution
**Goal:** a real person relays from their phone and their click is logged.
**Use:** nanoid share codes · `/r/[code]` route handler (302) · `qrcode` lib · magic-link relayer auth.

- [ ] Relayer signup (email + lane; self-serve lane creation)
- [ ] Share kit per event × lane: WhatsApp text, IG caption, OG/story images (EN/AR), 15s video script — per-channel copy buttons
- [ ] `/r/[code]`: insert `clicks(ts, referrer, ua, country)` → 302 to donation URL with `?ref=code`
- [ ] Relayer dashboard: own links, views, clicks, confirmed $
- [ ] Printable QR per link (khutbah slides, tabling days)

**Done when:** a share sent from a phone lands on the donation page and the matching `clicks` row exists.

### Layer 6 — Money path (the honesty core)
**Goal:** one real donation travels link → pending → confirmed, visibly.
**Use:** LaunchGood campaign per event (organizer of the brief — ask them early) · CSV export · webhook stub for later.

- [ ] Confirm LaunchGood preserves a pass-through `?ref=` (or fall back to per-event campaign totals)
- [ ] Tracked click ≠ donation: clicks never render as donations anywhere
- [ ] Reconcile importer: match ref/amount/date → mark **confirmed** with method labeled
- [ ] `/api/webhooks/donation` stub (secret-validated upsert, `method = webhook`) so the enum is future-proof
- [ ] UI rule enforced everywhere: **confirmed** (green) vs **pending reconciliation** (amber) vs **tracked click**

**Done when:** a donation made through a relay link shows as pending, then confirmed after import — and the chain board reflects it.

### Layer 7 — Chain & impact
**Goal:** every displayed number is defensible on stage.
**Use:** SQL views for aggregates · simple polling refresh (no websockets needed).

- [ ] Event chain board fed by SQL views (not hand-waved math)
- [ ] `/impact` global board: totals, top lanes, opt-in relayer leaderboard
- [ ] Relayer "your chain" card is shareable ("what my circle moved")
- [ ] Verify: every board number reproducible by a direct SQL query

**Done when:** you can hand a judge a SQL console and the numbers still match.

### Layer 8 — Trust, polish & resilience
**Goal:** it feels finished on a cold open, on a phone.
**Use:** Sentry alerting · Upstash (or in-memory) rate limit · Lighthouse.

- [ ] Sentry + cron failure alerts; `/r/[code]` rate-limited
- [ ] Arabic share-kit assets and language toggle on event/relay
- [ ] `/how-it-works` page — the honesty explainer (great pitch link)
- [ ] Accessibility pass: contrast, focus states, labels
- [ ] Lighthouse mobile performance ≥ 80
- [ ] Demo seed clearly flagged `is_demo` so live vs sample data never conflates

**Done when:** an unannounced phone cold-open feels like a product, not a prototype.

### Layer 9 — Submit & pitch
**Goal:** submitted early, demo rehearsed, nothing left to chance.

- [ ] 30–60s highlight video: problem (5s) → product loop (20s) → proof numbers on the chain board (15s) → CTA (5s)
- [ ] Submit link + video at habibi.tech/brandathon **before Fri Sept 25, 5:00 PM ET** — aim for 24h early
- [ ] ≥ 15 real relayers active in the final 48h (reach you can show)
- [ ] Rehearse the 10-min live path: feed → event → relay → give → chain updates
- [ ] Backups: recorded demo + locally seeded laptop in case of network failure

**Done when:** submitted, confirmed, rehearsed twice.

---

## Track B — non-code, starts day 1 (parallel)

- [ ] Message Ethar Relief: donation-copy approvals, field imagery with credits, a point of contact for reconciliation
- [ ] LaunchGood: per-event campaign(s) set up; confirm `?ref=` handling
- [ ] Recruit 15–20 relayers (campus MSAs, mosque circles, diaspora WhatsApp groups, small creators) — onboard them on Layer 5's first deploy
- [ ] Draft the daily "moment" ritual for promotion week: one approved event pushed to all lanes each day

## Suggested schedule (challenge drop → submission)

| Day | Track A | Track B |
|---|---|---|
| 1–2 | L0 + L1 | message Ethar + LaunchGood; recruit first 5 relayers |
| 3 | L2 ingest + drafting working | relayer list growing |
| 4 | L4 newsroom (first human-approved event!) | daily moment ritual starts |
| 5 | L3 feed/event/OG | promote pushed events |
| 6 | L5 relay + tracking | relayers onboarded |
| 7 | L6 money path + L7 boards | drive first real donations |
| 8 | L8 polish; record video | hardest promotion push (it's scored) |
| 9 | L9 submit ≥ 24h early | warm relayers for final 48h |

## Risks & fallbacks

| Risk | Fallback |
|---|---|
| LaunchGood ref not trackable in time | Manual reconciliation from their export, clearly labeled `csv_reconcile` — still honest |
| News-source licensing worries | RSS/official feeds only, always credited and linked |
| LLM drifts beyond sources | Zod rejects claims without sourceIds; editor gate is the backstop |
| Free cron limits | 30-min cadence is fine; add a manual "run ingest" button for the demo |
| Donations too slow to confirm | Show the pending pipeline honestly + drive 3–5 small real gifts via relayers before pitch |

## Design assets

- Mockups + design system: `witness-relay-design/` (HTML views, `theme.css`, 2× renders in `renders-2x/`)
- Team-share walkthrough: `witness-relay-design/Witness-Relay-Design-Walkthrough.html` (self-contained)
- Brand: indigo `#221C44`, cream `#F6F1E5`, relay red `#E8442E`, confirmed green `#1E7F4F` · Fraunces / IBM Plex Mono / Inter
