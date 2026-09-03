-- ============================================================
--  FreelanceHub — user_settings invoice/address columns
--  Run this once in Supabase → SQL Editor (as the project owner).
--  Fixes: Account & Settings "Invoice details" section failing to
--  save with "Could not find the 'address_city' column..." — the
--  UI has always had these fields, but the base user_settings
--  table was never given the matching columns.
-- ============================================================

alter table user_settings
  add column if not exists address_street  text,
  add column if not exists address_city    text,
  add column if not exists address_state   text,
  add column if not exists address_zip     text,
  add column if not exists address_country text,
  add column if not exists business_phone  text,
  add column if not exists business_email  text;

-- ============================================================
--  Done. After running this, reload FreelanceHub — Account &
--  Settings will save invoice/address details without error.
-- ============================================================
