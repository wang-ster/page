-- =====================================================================
-- SOC COMMAND — update: class order for students
-- Run once in Supabase → SQL Editor. Safe to run again.
-- =====================================================================
alter table public.profiles add column if not exists sort_order int;

-- the CISO saves the class order in one go (list of student ids, first to last)
create or replace function public.ciso_set_order(p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_ciso() then raise exception 'CISO clearance required.'; end if;
  update profiles p set sort_order = x.ord
    from unnest(p_ids) with ordinality as x(id, ord)
   where p.id = x.id;
end $$;
revoke execute on function public.ciso_set_order(uuid[]) from public, anon;
grant  execute on function public.ciso_set_order(uuid[]) to authenticated;

-- roster now comes back in class order (CISOs first, then students in your order)
create or replace function public.roster() returns setof json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_ciso() then raise exception 'CISO clearance required.'; end if;
  return query
    select (wallet(id)::jsonb || jsonb_build_object('sort_order', sort_order))::json
      from profiles
     order by case role when 'ciso' then 0 when 'analyst' then 1 else 2 end,
              sort_order nulls last, lower(coalesce(display_name, username));
end $$;
