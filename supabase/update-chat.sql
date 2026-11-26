-- =====================================================================
-- SOC COMMAND — update: class chat
-- Run once in Supabase → SQL Editor. Safe to run again.
-- Students post through chat_send(), which enforces: chat open, not muted,
-- slow mode, 500-character limit and the blocked-word filter.
-- Only the CISO can delete messages, mute students or change settings.
-- =====================================================================
alter table public.profiles add column if not exists chat_muted boolean not null default false;

create table if not exists public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles on delete cascade,
  author       text not null,                       -- name at the time of posting
  author_role  text not null,
  body         text not null check (char_length(body) between 1 and 500),
  created_at   timestamptz not null default now(),
  deleted      boolean not null default false
);
create index if not exists chat_messages_time on public.chat_messages (created_at desc);

create table if not exists public.chat_settings (
  id            int primary key default 1 check (id = 1),
  enabled       boolean not null default true,
  slow_seconds  int not null default 3 check (slow_seconds between 0 and 300),
  blocked       text[] not null default array['fuck','shit','bitch','asshole','bastard','dick','cunt','slut','whore','retard']
);
insert into public.chat_settings (id) values (1) on conflict do nothing;

create or replace function public.chat_send(p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; cs chat_settings; b text := btrim(coalesce(p_body, '')); w text; last_at timestamptz;
begin
  select * into me from profiles where id = auth.uid();
  if not found or me.role not in ('ciso', 'analyst') then raise exception 'not allowed'; end if;
  select * into cs from chat_settings where id = 1;
  if me.role <> 'ciso' then
    if not cs.enabled then raise exception 'Chat is closed right now.'; end if;
    if me.chat_muted then raise exception 'You have been muted by your CISO.'; end if;
    select max(created_at) into last_at from chat_messages where user_id = me.id;
    if cs.slow_seconds > 0 and last_at is not null and last_at > now() - make_interval(secs => cs.slow_seconds) then
      raise exception 'Slow mode: wait % seconds between messages.', cs.slow_seconds;
    end if;
  end if;
  if b = '' then raise exception 'Message is empty.'; end if;
  if char_length(b) > 500 then raise exception 'Messages are limited to 500 characters.'; end if;
  -- blocked words become ****  (matches the start of a word, so "shitty" is caught too)
  foreach w in array coalesce(cs.blocked, '{}') loop
    w := lower(regexp_replace(w, '[^a-zA-Z0-9]', '', 'g'));
    if w <> '' then b := regexp_replace(b, '\m' || w || '\w*', repeat('*', length(w)), 'gi'); end if;
  end loop;
  insert into chat_messages (user_id, author, author_role, body)
  values (me.id, coalesce(nullif(btrim(me.display_name), ''), me.username), me.role, b);
end $$;
revoke execute on function public.chat_send(text) from public, anon;
grant  execute on function public.chat_send(text) to authenticated;

alter table public.chat_messages enable row level security;
alter table public.chat_settings enable row level security;
drop policy if exists chat_read on public.chat_messages;
drop policy if exists chat_ciso on public.chat_messages;
drop policy if exists chats_read on public.chat_settings;
drop policy if exists chats_ciso on public.chat_settings;
-- everyone in the class reads the chat (the CISO also sees deleted messages)
create policy chat_read  on public.chat_messages for select to authenticated using (is_member() and (not deleted or is_ciso()));
create policy chat_ciso  on public.chat_messages for all    to authenticated using (is_ciso()) with check (is_ciso());
create policy chats_read on public.chat_settings for select to authenticated using (is_member());
create policy chats_ciso on public.chat_settings for all    to authenticated using (is_ciso()) with check (is_ciso());

grant select, insert, update, delete on public.chat_messages, public.chat_settings to authenticated;
grant all on public.chat_messages, public.chat_settings to service_role;
revoke all on public.chat_messages, public.chat_settings from anon;
