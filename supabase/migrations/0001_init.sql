-- ============================================================
-- Witness Relay — 0001_init
-- Schema for: sources → events → story packs → relay → attribution
-- Run in Supabase SQL editor, or via supabase CLI migration.
-- ============================================================

-- ---------- enums ----------
create type event_status      as enum ('draft', 'in_review', 'approved', 'paused', 'archived');
create type lane_type         as enum ('mosque', 'campus', 'creator', 'diaspora', 'other');
create type story_status      as enum ('draft', 'current', 'superseded');
create type decision_action   as enum ('auto_draft', 'request_edit', 'revise', 'approve', 'pause', 'reject', 'note');
create type asset_kind        as enum ('og', 'story', 'feed', 'whatsapp_text', 'ig_caption', 'video_script');
create type donation_method   as enum ('launchgood_ref', 'csv_reconcile', 'webhook');
create type donation_status   as enum ('pending', 'confirmed');

-- ---------- relay network ----------
create table relay_lanes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        lane_type not null default 'other',
  region      text,
  language    text not null default 'en',
  notes       text,
  created_at  timestamptz not null default now()
);

create table relayers (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,
  email         text not null unique,
  optin_leaderboard boolean not null default false,
  created_at    timestamptz not null default now()
);

create table lane_members (
  relayer_id  uuid not null references relayers(id) on delete cascade,
  lane_id     uuid not null references relay_lanes(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (relayer_id, lane_id)
);

-- ---------- editorial core ----------
create table events (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  headline        text not null,
  location_label  text,
  happened_at     timestamptz,
  status          event_status not null default 'draft',
  explainer_what  text,
  explainer_why   text,
  donation_ask    text,               -- Ethar-approved copy; edits require Ethar sign-off
  ethar_copy_locked boolean not null default false,
  is_demo         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table sources (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  outlet        text not null,
  title         text not null,
  url           text not null,
  quote         text,
  published_at  timestamptz,
  is_field_report boolean not null default false,
  fetched_at    timestamptz not null default now()
);

create table story_packs (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  version        int not null default 1,
  language       text not null default 'en',
  headline       text not null,
  claims         jsonb not null default '[]'::jsonb,
  -- claims: [{ "text": "...", "sourceIds": ["<source uuid>", ...] }]
  ai_confidence  numeric(3,2),
  status         story_status not null default 'draft',
  created_at     timestamptz not null default now()
);

create table editorial_decisions (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  story_pack_id  uuid references story_packs(id) on delete set null,
  actor          text not null default 'system',
  action         decision_action not null,
  note           text,
  created_at     timestamptz not null default now()
);

create table assets (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  kind         asset_kind not null,
  language     text not null default 'en',
  storage_path text,
  body         text,                   -- caption/script text stored inline
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- ---------- relay & attribution ----------
create table share_links (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  event_id    uuid not null references events(id) on delete cascade,
  lane_id     uuid not null references relay_lanes(id) on delete cascade,
  relayer_id  uuid not null references relayers(id) on delete cascade,
  channel     text not null default 'whatsapp',
  created_at  timestamptz not null default now()
);

-- a tracked /r/[code] redirect hit = one attributed view of the event
create table link_views (
  id            bigserial primary key,
  share_link_id uuid not null references share_links(id) on delete cascade,
  event_id      uuid not null references events(id) on delete cascade,
  ts            timestamptz not null default now(),
  referrer      text,
  user_agent    text,
  country       text
);

-- a Give tap from an attributed session = one tracked click toward donations
create table donation_clicks (
  id            bigserial primary key,
  share_link_id uuid not null references share_links(id) on delete cascade,
  event_id      uuid not null references events(id) on delete cascade,
  ts            timestamptz not null default now(),
  user_agent    text
);

create table donation_attributions (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  share_link_id uuid references share_links(id) on delete set null,
  method        donation_method not null,
  status        donation_status not null default 'pending',
  amount        numeric(12,2),
  currency      text not null default 'USD',
  external_ref  text,
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- indexes ----------
create index events_status_idx        on events (status);
create index sources_event_idx        on sources (event_id);
create index story_packs_event_idx    on story_packs (event_id);
create index assets_event_idx         on assets (event_id);
create index share_links_code_idx     on share_links (code);
create index share_links_event_idx    on share_links (event_id);
create index link_views_link_ts_idx   on link_views (share_link_id, ts desc);
create index link_views_event_idx     on link_views (event_id);
create index donation_clicks_event_idx on donation_clicks (event_id);
create index donation_attr_event_idx  on donation_attributions (event_id);

-- ---------- updated_at trigger ----------
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger events_updated_at before update on events
  for each row execute function touch_updated_at();

-- ---------- row level security ----------
-- Prototype model: the public site reads only APPROVED content via anon policies;
-- every write goes through the server with the service-role key (bypasses RLS).
alter table events                enable row level security;
alter table sources               enable row level security;
alter table story_packs           enable row level security;
alter table assets                enable row level security;
alter table relay_lanes           enable row level security;
alter table relayers              enable row level security;
alter table lane_members          enable row level security;
alter table share_links           enable row level security;
alter table link_views            enable row level security;
alter table donation_clicks       enable row level security;
alter table donation_attributions enable row level security;
alter table editorial_decisions   enable row level security;

create policy "public read approved events" on events
  for select using (status = 'approved');

create policy "public read sources of approved events" on sources
  for select using (
    exists (select 1 from events e where e.id = event_id and e.status = 'approved')
  );

create policy "public read current packs of approved events" on story_packs
  for select using (
    status = 'current' and
    exists (select 1 from events e where e.id = event_id and e.status = 'approved')
  );

create policy "public read assets of approved events" on assets
  for select using (
    exists (select 1 from events e where e.id = event_id and e.status = 'approved')
  );

create policy "public read lanes"      on relay_lanes for select using (true);
create policy "public read relayers"   on relayers    for select using (true);
create policy "public read lane members" on lane_members for select using (true);
create policy "public read share links"  on share_links  for select using (true);

-- link_views / donation_clicks / donation_attributions / editorial_decisions:
-- no anon policies — reachable only through the event_chain view (aggregates)
-- and the server (service role).

-- ---------- public chain stats view ----------
-- Views run with the view owner's rights, so this safely exposes aggregates only.
create or replace view event_chain as
select
  e.id                                                        as event_id,
  e.slug                                                      as slug,
  (select count(distinct sl.lane_id)
     from share_links sl where sl.event_id = e.id)            as lanes_count,
  (select count(distinct sl.relayer_id)
     from share_links sl where sl.event_id = e.id)            as relayers_count,
  (select count(*) from link_views lv
     where lv.event_id = e.id)                                as views,
  (select count(*) from donation_clicks dc
     where dc.event_id = e.id)                                as clicks,
  coalesce((select sum(da.amount) from donation_attributions da
     where da.event_id = e.id and da.status = 'confirmed'),0) as confirmed_amount,
  (select count(*) from donation_attributions da
     where da.event_id = e.id and da.status = 'confirmed')    as confirmed_count,
  (select count(*) from donation_attributions da
     where da.event_id = e.id and da.status = 'pending')      as pending_count
from events e;

grant select on event_chain to anon, authenticated;

-- per-lane breakdown for the chain board
create or replace view event_lane_chain as
select
  sl.event_id,
  sl.lane_id,
  l.name                                                      as lane_name,
  count(distinct sl.relayer_id)                               as relayers_count,
  (select count(*) from link_views lv
     where lv.event_id = sl.event_id and lv.share_link_id in
       (select id from share_links s2 where s2.lane_id = sl.lane_id and s2.event_id = sl.event_id))
                                                              as views,
  (select count(*) from donation_clicks dc
     where dc.event_id = sl.event_id and dc.share_link_id in
       (select id from share_links s2 where s2.lane_id = sl.lane_id and s2.event_id = sl.event_id))
                                                              as clicks,
  coalesce((select sum(da.amount) from donation_attributions da
     where da.event_id = sl.event_id and da.status = 'confirmed'
       and da.share_link_id in
       (select id from share_links s2 where s2.lane_id = sl.lane_id and s2.event_id = sl.event_id)),0)
                                                              as confirmed_amount
from share_links sl
join relay_lanes l on l.id = sl.lane_id
group by sl.event_id, sl.lane_id, l.name;

grant select on event_lane_chain to anon, authenticated;
