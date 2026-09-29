-- ============================================================
-- Witness Relay — 0003_stripe_method
-- Adds 'stripe' to the donation_method enum so Stripe Checkout
-- confirmations (test mode demo + a future Ethar Stripe account)
-- are honestly labeled alongside launchgood_ref / csv_reconcile / webhook.
--
-- Run in the Supabase SQL editor after 0002.
-- ============================================================

alter type donation_method add value if not exists 'stripe' after 'webhook';
