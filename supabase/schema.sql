-- =====================================================================
-- SOC COMMAND — database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a fresh project.
-- =====================================================================

-- ---------- PROFILES (one per login) ----------
-- role: 'ciso'    = instructor, full control
--       'analyst' = student
--       'pending' = account that wasn't created through the console (no access)
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text unique not null,
  display_name  text,
  role          text not null default 'pending' check (role in ('ciso','analyst','pending')),
  diamonds      int  not null default 0,
  bonus_xp      int  not null default 0,
  bonus_coins   int  not null default 0,
  created_at    timestamptz not null default now()
);

create or replace function public.is_ciso() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'ciso');
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('ciso','analyst'));
$$;

-- every new login gets a profile automatically (as 'pending' until the console sets a role)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, display_name)
  values (new.id,
          lower(split_part(new.email, '@', 1)),
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- LEVELS / MILESTONES ----------
create table public.levels (
  level  int primary key,
  xp     int  not null,
  rank   text not null,
  name   text not null,
  coins  int  not null default 0
);
insert into public.levels (level, xp, rank, name, coins) values
  (1,    0, 'Recruit',            'Clearance Granted',     0),
  (2,  100, 'Trainee',            'Badge Issued',         50),
  (3,  250, 'Tier 1 Analyst',     'First Alert Triaged',  75),
  (4,  450, 'Tier 1 Analyst',     'Log Diver',           100),
  (5,  700, 'Tier 2 Analyst',     'Pattern Spotter',     125),
  (6, 1000, 'Tier 2 Analyst',     'Phish Fryer',         150),
  (7, 1400, 'Incident Responder', 'Containment Achieved',200),
  (8, 1900, 'Threat Hunter',      'Hunter''s Instinct',  250),
  (9, 2500, 'Threat Hunter',      'Adversary Mindset',   300),
  (10,3200, 'SOC Lead',           'Command Authority',   500);

-- ---------- LABS (the uploaded HTML lives here, not on the public site) ----------
create table public.labs (
  id           uuid primary key default gen_random_uuid(),
  code         text not null,
  title        text not null,
  category     text not null default 'General',
  threat       int  not null default 1 check (threat between 1 and 3),
  xp           int  not null default 100 check (xp >= 0),
  description  text not null default '',
  html         text not null,
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------- SUBMISSIONS ----------
create table public.completions (
  user_id       uuid references public.profiles on delete cascade,
  lab_id        uuid references public.labs on delete cascade,
  score         numeric,
  max_score     numeric,
  data          jsonb,
  submitted_at  timestamptz not null default now(),
  grade         numeric,
  feedback      text,
  graded_at     timestamptz,
  primary key (user_id, lab_id)
);

-- ---------- SAVED LAB PROGRESS (so work follows the student between devices) ----------
create table public.lab_state (
  user_id     uuid references public.profiles on delete cascade,
  lab_id      uuid references public.labs on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, lab_id)
);

-- ---------- SHOP ----------
create table public.shop_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  icon         text not null default 'star',
  currency     text not null check (currency in ('coins','diamonds')),
  cost         int  not null check (cost > 0),
  active       boolean not null default true,
  sort         int  not null default 0
);
insert into public.shop_items (name, description, icon, currency, cost, sort) values
  ('Candy',                 'One piece from the candy bin.',                  'candy',  'coins',     75, 1),
  ('Bag of Chips',          'One small bag of chips.',                        'chips',  'coins',    150, 2),
  ('Pick Your Seat',        'Sit anywhere for one class period.',             'star',   'coins',    200, 3),
  ('Music During Lab',      'Headphones allowed during one lab.',             'music',  'coins',    250, 4),
  ('Choose a Lab Scenario', 'Pick the story theme for an upcoming lab.',      'shield', 'coins',    400, 5),
  ('Late Pass',             'Turn in one assignment a day late, no penalty.', 'clock',  'diamonds',   2, 6),
  ('Homework Pass',         'Skip one homework assignment.',                  'ticket', 'diamonds',   3, 7),
  ('+5 Bonus Points',       'Five extra points on one quiz.',                 'chest',  'diamonds',   5, 8);

create table public.requisitions (
  id           uuid primary key default gen_random_uuid(),
  code         text not null,
  user_id      uuid not null references public.profiles on delete cascade,
  item_id      uuid references public.shop_items on delete set null,
  item_name    text not null,
  currency     text not null,
  cost         int  not null,
  status       text not null default 'pending' check (status in ('pending','fulfilled','denied')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- ---------- ANNOUNCEMENTS ----------
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  created_at  timestamptz not null default now()
);
insert into public.announcements (title, body) values
  ('Welcome to SOC Command', 'Clear mini-labs to earn XP, rank up, and unlock coins for the Supply Shop.');

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Rank, XP and wallet for one operator. Students may only ask about themselves.
create or replace function public.wallet(uid uuid default auth.uid()) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  p profiles; cur levels; nxt levels;
  v_xp int; v_cleared int; v_total int; v_earned int; v_spent_c int; v_spent_d int;
begin
  if uid is null or (uid <> auth.uid() and not is_ciso()) then
    raise exception 'not allowed';
  end if;
  select * into p from profiles where id = uid;
  if not found then raise exception 'no profile'; end if;

  select coalesce(sum(l.xp), 0), count(*) filter (where l.published)
    into v_xp, v_cleared
    from completions c join labs l on l.id = c.lab_id
   where c.user_id = uid;
  v_xp := v_xp + p.bonus_xp;

  select * into cur from levels where xp <= v_xp order by xp desc limit 1;
  select * into nxt from levels where xp >  v_xp order by xp asc  limit 1;
  select coalesce(sum(coins), 0) + p.bonus_coins into v_earned from levels where xp <= v_xp;
  select coalesce(sum(cost) filter (where currency = 'coins'), 0),
         coalesce(sum(cost) filter (where currency = 'diamonds'), 0)
    into v_spent_c, v_spent_d
    from requisitions where user_id = uid and status <> 'denied';
  select count(*) into v_total from labs where published;

  return json_build_object(
    'id', uid, 'username', p.username, 'display_name', p.display_name, 'role', p.role,
    'xp', v_xp, 'level', coalesce(cur.level, 1), 'rank', coalesce(cur.rank, 'Recruit'),
    'cur_xp', coalesce(cur.xp, 0), 'next_xp', nxt.xp, 'next_level', nxt.level, 'next_coins', nxt.coins,
    'coins', v_earned - v_spent_c, 'diamonds', p.diamonds - v_spent_d,
    'bonus_xp', p.bonus_xp, 'bonus_coins', p.bonus_coins, 'diamonds_awarded', p.diamonds,
    'cleared', v_cleared, 'total_labs', v_total);
end $$;

-- Everyone's wallet (CISO console)
create or replace function public.roster() returns setof json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_ciso() then raise exception 'CISO only'; end if;
  return query select wallet(id) from profiles order by role, username;
end $$;

-- Student buys something: balance is checked on the server, not in the browser
create or replace function public.request_item(p_item uuid) returns json
language plpgsql security definer set search_path = public as $$
declare it shop_items; w json; c text;
begin
  if not is_member() then raise exception 'not allowed'; end if;
  select * into it from shop_items where id = p_item and active;
  if not found then raise exception 'That item is no longer available.'; end if;
  w := wallet(auth.uid());
  if (w->>it.currency)::int < it.cost then
    raise exception 'Not enough %.', it.currency;
  end if;
  c := 'REQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into requisitions (code, user_id, item_id, item_name, currency, cost)
  values (c, auth.uid(), it.id, it.name, it.currency, it.cost);
  return json_build_object('code', c, 'item', it.name, 'cost', it.cost, 'currency', it.currency, 'created_at', now());
end $$;

-- Student submits a lab. They can resubmit until it's graded.
create or replace function public.submit_lab(p_lab uuid, p_score numeric default null,
                                             p_max numeric default null, p_data jsonb default null) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not is_member() then raise exception 'not allowed'; end if;
  if not exists (select 1 from labs where id = p_lab and published) then
    raise exception 'This lab is not available.';
  end if;
  if exists (select 1 from completions where user_id = auth.uid() and lab_id = p_lab and graded_at is not null) then
    raise exception 'This lab has already been graded.';
  end if;
  insert into completions (user_id, lab_id, score, max_score, data)
  values (auth.uid(), p_lab, p_score, p_max, p_data)
  on conflict (user_id, lab_id) do update
    set score = excluded.score, max_score = excluded.max_score,
        data = excluded.data, submitted_at = now();
  return 'submitted';
end $$;

-- =====================================================================
-- ROW LEVEL SECURITY — who can read/write what
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.levels        enable row level security;
alter table public.labs          enable row level security;
alter table public.completions   enable row level security;
alter table public.lab_state     enable row level security;
alter table public.shop_items    enable row level security;
alter table public.requisitions  enable row level security;
alter table public.announcements enable row level security;

-- profiles: see yourself; CISO sees and edits everyone
create policy profiles_read  on public.profiles for select to authenticated using (id = auth.uid() or is_ciso());
create policy profiles_ciso  on public.profiles for all    to authenticated using (is_ciso()) with check (is_ciso());

-- levels, shop items, announcements: members read; CISO edits
create policy levels_read on public.levels for select to authenticated using (is_member());
create policy levels_ciso on public.levels for all    to authenticated using (is_ciso()) with check (is_ciso());
create policy shop_read   on public.shop_items for select to authenticated using (is_member());
create policy shop_ciso   on public.shop_items for all    to authenticated using (is_ciso()) with check (is_ciso());
create policy ann_read    on public.announcements for select to authenticated using (is_member());
create policy ann_ciso    on public.announcements for all    to authenticated using (is_ciso()) with check (is_ciso());

-- labs: members see published labs; CISO sees drafts and manages everything
create policy labs_read on public.labs for select to authenticated using ((published and is_member()) or is_ciso());
create policy labs_ciso on public.labs for all    to authenticated using (is_ciso()) with check (is_ciso());

-- submissions: students read their own (writes go through submit_lab); CISO grades
create policy comp_read on public.completions for select to authenticated using (user_id = auth.uid() or is_ciso());
create policy comp_ciso on public.completions for all    to authenticated using (is_ciso()) with check (is_ciso());

-- saved progress: each member owns their own
create policy state_own  on public.lab_state for all    to authenticated
  using (user_id = auth.uid() and is_member()) with check (user_id = auth.uid() and is_member());
create policy state_ciso on public.lab_state for select to authenticated using (is_ciso());

-- requisitions: students read their own (created via request_item); CISO fulfills/denies
create policy req_read on public.requisitions for select to authenticated using (user_id = auth.uid() or is_ciso());
create policy req_ciso on public.requisitions for all    to authenticated using (is_ciso()) with check (is_ciso());

-- logged-out visitors get nothing
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
