-- =====================================================================
-- SOC COMMAND — update: students choose their own password at first login
-- Run once in Supabase → SQL Editor. Safe to run again.
-- Accounts made (or reset) in the Console are flagged; the site makes the
-- student set a new password before they can do anything else.
-- =====================================================================
alter table public.profiles add column if not exists must_change_pw boolean not null default false;

-- a student clears their own flag right after changing their password
create or replace function public.password_changed() returns void
language sql security definer set search_path = public as $$
  update profiles set must_change_pw = false where id = auth.uid();
$$;
revoke execute on function public.password_changed() from public, anon;
grant  execute on function public.password_changed() to authenticated;
