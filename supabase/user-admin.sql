-- =====================================================================
-- SOC COMMAND — account management inside the database
-- Run once in Supabase → SQL Editor. After this, the CISO Console creates,
-- resets, deletes and promotes accounts by itself (no Edge Function needed).
-- Every function checks that the caller is a CISO before doing anything.
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- Create a login. Username becomes  username@soc.local  behind the scenes.
create or replace function public.ciso_create_user(p_username text, p_password text,
                                                   p_display text default null, p_role text default 'analyst')
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid  uuid := gen_random_uuid();
  u    text := lower(trim(coalesce(p_username, '')));
  em   text;
  disp text;
begin
  if not is_ciso() then raise exception 'CISO clearance required.'; end if;
  if u !~ '^[a-z0-9._-]{2,32}$' then
    raise exception 'Username "%": use 2–32 letters, numbers, dots, dashes or underscores.', p_username;
  end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Password must be at least 6 characters.'; end if;
  if p_role is null or p_role not in ('analyst', 'ciso') then p_role := 'analyst'; end if;
  em   := u || '@soc.local';
  disp := coalesce(nullif(trim(p_display), ''), u);
  if exists (select 1 from auth.users where lower(email) = em) or exists (select 1 from profiles where username = u) then
    raise exception 'Username "%" is already taken.', u;
  end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em,
          crypt(p_password, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('display_name', disp),
          now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
          jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true),
          'email', now(), now(), now());

  -- the signup trigger made the profile as 'pending'; activate it
  insert into profiles (id, username, display_name, role) values (uid, u, disp, p_role)
  on conflict (id) do update set role = excluded.role, display_name = excluded.display_name;
  return uid;
end $$;

-- Set a new password for anyone.
create or replace function public.ciso_reset_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_ciso() then raise exception 'CISO clearance required.'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Password must be at least 6 characters.'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
  if not found then raise exception 'No such user.'; end if;
end $$;

-- Change someone's role (analyst / ciso / pending).
create or replace function public.ciso_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_ciso() then raise exception 'CISO clearance required.'; end if;
  if p_user = auth.uid() then raise exception 'You can''t change your own role.'; end if;
  if p_role not in ('analyst', 'ciso', 'pending') then raise exception 'Bad role.'; end if;
  update profiles set role = p_role where id = p_user;
end $$;

-- Delete a login and everything attached to it.
create or replace function public.ciso_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_ciso() then raise exception 'CISO clearance required.'; end if;
  if p_user = auth.uid() then raise exception 'You can''t delete yourself.'; end if;
  delete from auth.users where id = p_user;   -- profile, submissions, progress, tickets cascade
end $$;

revoke execute on function public.ciso_create_user(text, text, text, text), public.ciso_reset_password(uuid, text),
                           public.ciso_set_role(uuid, text), public.ciso_delete_user(uuid) from public, anon;
grant  execute on function public.ciso_create_user(text, text, text, text), public.ciso_reset_password(uuid, text),
                           public.ciso_set_role(uuid, text), public.ciso_delete_user(uuid) to authenticated;
