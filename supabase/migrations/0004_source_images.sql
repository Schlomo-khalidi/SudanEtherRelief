-- ============================================================
-- Witness Relay — 0004_source_images
-- News sources carry their own article image (extracted from the feed
-- or the article page), so pipeline-drafted events get real photography
-- from the story itself — credited to the outlet.
--
-- Run in the Supabase SQL editor after 0003.
-- ============================================================

alter table sources add column if not exists image_url text;
