-- =====================================================================
-- SOC COMMAND — update: Lab Builder, screenshots, live progress
-- Run once in Supabase → SQL Editor. Safe to run again.
-- =====================================================================

-- ---------- labs made in the Lab Builder ----------
-- kind 'html'  = uploaded HTML file (stored in html)
-- kind 'built' = made in the Lab Builder (stored in content as a list of blocks)
alter table public.labs add column if not exists kind text not null default 'html';
alter table public.labs add column if not exists content jsonb;
alter table public.labs alter column html set default '';
do $$ begin
  alter table public.labs add constraint labs_kind_check check (kind in ('html', 'built'));
exception when duplicate_object then null; end $$;

-- ---------- live progress: latest score a lab reported while the student works ----------
alter table public.lab_state add column if not exists score numeric;
alter table public.lab_state add column if not exists max_score numeric;

-- ---------- screenshot uploads (private; students see only their own) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 10485760,
        array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists soc_shots_own  on storage.objects;
drop policy if exists soc_shots_ciso on storage.objects;
-- files live at  <student id>/<lab id>/<file>; a student can only touch their own folder
create policy soc_shots_own on storage.objects for all to authenticated
  using      (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text and public.is_member())
  with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text and public.is_member());
create policy soc_shots_ciso on storage.objects for all to authenticated
  using (bucket_id = 'screenshots' and public.is_ciso()) with check (bucket_id = 'screenshots' and public.is_ciso());
