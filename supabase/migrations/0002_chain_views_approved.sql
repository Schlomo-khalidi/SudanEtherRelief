-- ============================================================
-- Witness Relay — 0002_chain_views_approved
-- Hardening: the event_chain / event_lane_chain views run with the
-- view owner's rights, so without a status filter they exposed slugs
-- and stats of DRAFT events to anonymous readers. Restrict both to
-- approved events (public pages only ever query approved anyway).
--
-- Run in the Supabase SQL editor after 0001_init.sql.
-- ============================================================

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
from events e
where e.status = 'approved';

grant select on event_chain to anon, authenticated;

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
join events e on e.id = sl.event_id
where e.status = 'approved'
group by sl.event_id, sl.lane_id, l.name;

grant select on event_lane_chain to anon, authenticated;
