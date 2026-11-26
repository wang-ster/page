-- =====================================================================
-- SOC COMMAND — update: "Late" mark on the Character Chart
-- Run once in Supabase → SQL Editor. Safe to run again.
-- A late student's grade is capped at S and shown with /L (S/L or U/L).
-- =====================================================================
alter table public.character_days add column if not exists late boolean not null default false;
