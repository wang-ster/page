-- =====================================================================
-- SOC COMMAND — permissions fix
-- Run this once in Supabase → SQL Editor if the Console shows
-- "permission denied". Newer Supabase projects don't give the website
-- access to new tables automatically; this grants it explicitly.
-- Row Level Security still decides what each person can see and change.
-- =====================================================================
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- logged-out visitors still get nothing
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;

-- activate students that were created while permissions were missing
-- (they got stuck as 'pending'). Sign-ups are off, so every account was made by you.
update public.profiles set role = 'analyst' where role = 'pending';
