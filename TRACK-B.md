# Track B — the human track

The product is built. Everything left that judges can see — real reach, real donations,
real usage — comes from this file. Every item lists: the exact ask, who it goes to,
and what it unlocks in the product.

---

## 1. Ethar Relief — one email, four asks

**Send to:** your Ethar Relief contact (programs team for asks, comms for imagery).
**Attach:** `design/Witness-Relay-Design-Walkthrough.html` (self-contained product tour —
they can see the whole product without a link). The live URL follows with the Vercel deploy.

**Draft:**

> Subject: Witness Relay — ready for your sign-offs (2 minutes each)
>
> Salam [name],
>
> We've built Witness Relay for the HabibiTech brandathon: an AI newsroom that turns
> verified Sudan/East-Africa news into shareable "Witness Cards", hands them to
> mosques, campuses, creators and diaspora groups with tracked links, and attributes
> every confirmed donation to the community that moved it. Nothing publishes without
> a human editor, donation copy is locked to your approval, and we never use
> AI-generated imagery of affected people.
>
> Four things from your side — each is small:
>
> 1. **Donation-ask copy (most important).** Our pipeline drafted four current stories
>    (RSF drone strike in El Gezira, the UN agriculture initiative, UNGA diplomacy,
>    Baidoa insecurity). For each, your programs team writes the line our cards show:
>    what a donation supports, specifically, with real figures (e.g. "$40 — one
>    emergency food parcel for a family of six for two weeks"). We lock your text
>    into the card exactly as you write it.
> 2. **Image clearance.** We're using three Ethar photos (children supported by
>    Ethar Relief; the team arriving in Djibouti; a water-project site) with credit.
>    Please confirm we're cleared to use these three, or swap us for ones you prefer.
> 3. **The donation route.** Our cards can send donors to a LaunchGood campaign (with
>    a reference code per community, so you can see which masjid or campus raised
>    what) — or to your own checkout if you have one. Which do you prefer, and what's
>    the URL?
> 4. **One contact person** for copy sign-offs this week — drafts can arrive any
>    morning, and a same-day yes gets the story published the same day.
>
> Attached is a 2-minute walkthrough of the product. Happy to demo live any time.

**Unlocks:** item 1 → events publish with locked, Ethar-approved asks (the honesty
badge on every card). Item 2 → imagery labeled "cleared". Item 3 → real money path.
Item 4 → the pipeline runs at news speed.

- [ ] Email sent to Ethar
- [ ] Donation-ask copy received for the live events
- [ ] Image clearance confirmed
- [ ] Campaign URL + ref-handling answer received
- [ ] Contact person named

---

## 2. LaunchGood — the technical asks

**Send to:** whoever at LaunchGood the Ethar conversation reaches (they're an
organizer of the brandathon — this is a warm door).

**Draft:**

> We're sending you donors from community relays (mosques, campuses, diaspora
> WhatsApp groups). Three questions:
>
> 1. Can we point donors at a campaign URL with a `?ref=CODE` parameter, and does
>    that code survive into your donation records or export?
> 2. Could we get a sample of your donation export (CSV) so our reconciliation
>    import matches your format?
> 3. If you support webhooks or Zapier: our endpoint accepts
>    `POST /api/webhooks/donation` with `{"ref":"CODE","amount":25,"date":"ISO"}` and
>    a shared-secret header — a donation instantaneously confirms on the community's
>    public impact board.

**Unlocks:** the campaign URL fills `DONATION_BASE_URL` (Give buttons go live);
the export format tunes the reconcile importer; a webhook makes confirmations instant.

- [ ] Campaign URL received → paste into `.env.local` as `DONATION_BASE_URL`
- [ ] `?ref=` passthrough confirmed (or export-based fallback agreed)
- [ ] Sample export received → importer matched to it

---

## 3. Relayer activation — the five, then the many

**The founding five already have profiles:** Joshua, Allan, Gasser B., Newton, Linda.
Each person's 5 minutes:

1. Open **`/relay`** → join with their name + email + their lane.
2. On the dashboard, pick the day's approved story → **Relay this →**
3. Copy the WhatsApp text (or the Arabic version) and post it to their group.
4. Open their dashboard the next day — their chain moved, provably.

**Recruitment blurb (WhatsApp-ready):**

> Salam! I'm carrying Sudan news for a project called Witness Relay — it takes
> verified, editor-approved news about Sudan (the stories that dropped out of the
> feed) and turns every share into trackable donations for Ethar Relief. You get a
> card with real sources, a personal link, and you can literally watch what your
> one share moved. Takes 5 minutes: [link]. Want in?

**Expansion targets:** your campus MSA committee, one mosque's Friday-announcement
person, one diaspora WhatsApp admin, one creator with even 2k followers. 10–20
relayers posting the same story the same day is what the Reach score is made of.

**Decision (confirmed):** no manual relayer lists — every relayer self-serves at
`/relay` on their phone (name + email + lane, 30 seconds). Their signup creates
their profile and dashboard live; placeholder relayers stay as demo filler until
pruned before submission. Lane hygiene: real group names only in the "start a new
lane" box — junk test lanes get removed on request.

- [ ] All five founding relayers signed up on `/relay` (not just seeded)
- [ ] Each posted at least one kit this week
- [ ] 5–15 more recruited (campus / mosque / diaspora / creator)
- [ ] Every relayer shown their own dashboard once ("this is your chain")

---

## 4. The daily moment — promotion ritual

The scored week runs on one repeatable move, every day:

1. **Morning:** run ingest (newsroom button) → Gasser reviews the queue → approve
   what's solid (with Ethar copy locked, else request the copy).
2. **Midday:** post the day's moment in the founding WhatsApp group with each
   relayer's kit link — everyone posts the same story, same day. Coordinated
   volume is what makes a spike visible.
3. **Evening:** screenshot the event chain board (views → clicks → confirmed $) and
   post the update in the group. Relayers who see their number move post again.

Rule of the week: **push the news, not the product** — every post is a Sudan story
with sources, and the donation is simply where the story ends.

- [ ] Founding group chat created
- [ ] Day 1 moment executed end-to-end
- [ ] Chain-board screenshot posted daily

---

## Why this file matters

Originality, product and trust are earned in the code. **Reach and impact — two of
the four judged criteria — are earned here.** The pipeline is live, the links are
tracked, the board is public: every post from this page forward becomes a number a
judge can verify.
