-- =====================================================================
-- SOC COMMAND — update: one-time lab submission + Character Chart
-- Run once in Supabase → SQL Editor. Safe to run again.
-- =====================================================================

-- ---------- 1. Labs: students submit once; the CISO can unlock a resubmission ----------
alter table public.completions add column if not exists unlocked boolean not null default false;

create or replace function public.submit_lab(p_lab uuid, p_score numeric default null,
                                             p_max numeric default null, p_data jsonb default null) returns text
language plpgsql security definer set search_path = public as $$
declare c completions;
begin
  if not is_member() then raise exception 'not allowed'; end if;
  if not exists (select 1 from labs where id = p_lab and published) then
    raise exception 'This lab is not available.';
  end if;
  select * into c from completions where user_id = auth.uid() and lab_id = p_lab;
  if found and not c.unlocked then
    raise exception 'You already submitted this lab. Ask your CISO to unlock it if you need to resubmit.';
  end if;
  insert into completions (user_id, lab_id, score, max_score, data)
  values (auth.uid(), p_lab, p_score, p_max, p_data)
  on conflict (user_id, lab_id) do update
    set score = excluded.score, max_score = excluded.max_score, data = excluded.data,
        submitted_at = now(), unlocked = false, graded_at = null;   -- back in the grading queue
  return 'submitted';
end $$;

-- ---------- 2. Character Chart (CISO only) ----------
-- Buttons you press during class, e.g. "+2 Active participation", "-1 Distracted"
create table if not exists public.character_factors (
  id      uuid primary key default gen_random_uuid(),
  label   text not null,
  points  int  not null check (points <> 0),
  sort    int  not null default 0,
  active  boolean not null default true
);

-- Every button press (so you can undo or review the day)
create table if not exists public.character_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles on delete cascade,
  day         date not null,
  label       text not null,
  points      int  not null,
  created_at  timestamptz not null default now()
);
create index if not exists character_events_day on public.character_events (day, user_id);

-- Attendance (A / A/x) and manual overrides for a student on a day
create table if not exists public.character_days (
  user_id     uuid references public.profiles on delete cascade,
  day         date not null,
  attendance  text check (attendance in ('A', 'A/x')),
  override    text check (override in ('U', 'S', 'E')),
  note        text,
  primary key (user_id, day)
);

-- Grade rules: everyone starts at S (0 points).
-- Points >= e_at → E,  points <= u_at → U,  otherwise S.
create table if not exists public.character_settings (
  id    int primary key default 1 check (id = 1),
  e_at  int not null default 3,
  u_at  int not null default -3
);
insert into public.character_settings (id) values (1) on conflict do nothing;

insert into public.character_factors (label, points, sort)
select * from (values
  ('Active participation', 2, 1), ('Helped a classmate', 1, 2), ('On task', 1, 3), ('Great question', 1, 4),
  ('Distracted', -1, 5), ('Off-task device use', -1, 6), ('Disruptive', -2, 7), ('Disrespectful', -2, 8)
) v(label, points, sort)
where not exists (select 1 from public.character_factors);

alter table public.character_factors  enable row level security;
alter table public.character_events   enable row level security;
alter table public.character_days     enable row level security;
alter table public.character_settings enable row level security;

drop policy if exists cf_ciso on public.character_factors;
drop policy if exists ce_ciso on public.character_events;
drop policy if exists cd_ciso on public.character_days;
drop policy if exists cs_ciso on public.character_settings;
create policy cf_ciso on public.character_factors  for all to authenticated using (is_ciso()) with check (is_ciso());
create policy ce_ciso on public.character_events   for all to authenticated using (is_ciso()) with check (is_ciso());
create policy cd_ciso on public.character_days     for all to authenticated using (is_ciso()) with check (is_ciso());
create policy cs_ciso on public.character_settings for all to authenticated using (is_ciso()) with check (is_ciso());

grant select, insert, update, delete on public.character_factors, public.character_events,
      public.character_days, public.character_settings to authenticated;
grant all on public.character_factors, public.character_events,
      public.character_days, public.character_settings to service_role;
revoke all on public.character_factors, public.character_events,
      public.character_days, public.character_settings from anon;
