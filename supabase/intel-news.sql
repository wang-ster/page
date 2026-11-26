-- =====================================================================
-- SOC COMMAND — Intel news, fetched by the database itself
-- Run once in Supabase → SQL Editor. Safe to run again.
-- No Edge Function needed: the database downloads the news feeds every
-- 30 minutes (pg_cron) and the Intel page reads the saved headlines.
-- AFTER this finishes, run this as a separate query to fetch news right away:
--     select public.intel_refresh();
-- =====================================================================
create extension if not exists http with schema extensions;   -- lets the database fetch web pages

create table if not exists public.intel_items (
  link        text primary key,
  source      text not null,
  title       text not null,
  summary     text,
  published   timestamptz not null,
  fetched_at  timestamptz not null default now()
);
create table if not exists public.intel_status (
  source      text primary key,
  ok          boolean not null,
  count       int not null default 0,
  error       text,
  checked_at  timestamptz not null default now()
);
-- nobody reads these tables directly; the page uses intel_news() below
alter table public.intel_items  enable row level security;
alter table public.intel_status enable row level security;

-- text between <name ...> and </name> (first occurrence), or null
create or replace function public.intel_tag(chunk text, name text) returns text
language plpgsql immutable as $$
declare lc text := lower(chunk); n text := lower(name); a int; b int; i int; rest text; j int; k int;
begin
  a := strpos(lc, '<' || n || '>');
  b := strpos(lc, '<' || n || ' ');
  i := case when a = 0 then b when b = 0 then a else least(a, b) end;
  if i = 0 then return null; end if;
  rest := substr(chunk, i);
  j := strpos(rest, '>');
  if j = 0 or substr(rest, j - 1, 1) = '/' then return null; end if;     -- self-closing tag
  rest := substr(rest, j + 1);
  k := strpos(lower(rest), '</' || n || '>');
  if k = 0 then return null; end if;
  return substr(rest, 1, k - 1);
end $$;

-- strip CDATA, HTML tags and common entities
create or replace function public.intel_clean(t text) returns text
language sql immutable as $$
  select nullif(btrim(regexp_replace(
    replace(replace(replace(replace(replace(replace(replace(replace(replace(
      regexp_replace(
        replace(replace(replace(
          regexp_replace(coalesce(t, ''), '<!\[CDATA\[(.*?)\]\]>', '\1', 'g'),
        '&lt;', '<'), '&gt;', '>'), '&amp;', '&'),
      '<[^>]*>', ' ', 'g'),
    '&#8217;', '’'), '&#8216;', '‘'), '&#8220;', '“'), '&#8221;', '”'),
    '&quot;', '"'), '&#39;', ''''), '&#039;', ''''), '&nbsp;', ' '), '&amp;', '&'),
  '\s+', ' ', 'g')), '')
$$;

-- download every feed and save the last 7 days of headlines
create or replace function public.intel_refresh() returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  f record; resp record; body text; chunk text; parts text[];
  n int; total int := 0;
  v_title text; v_link text; v_date timestamptz; v_src text; v_sum text; raw_date text;
  ua constant text := 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
begin
  begin perform http_set_curlopt('CURLOPT_TIMEOUT', '8'); exception when others then null; end;
  for f in select * from (values
      ('CISA',                 'https://www.cisa.gov/cybersecurity-advisories/all.xml', false),
      ('CISA News',            'https://www.cisa.gov/news.xml', false),
      ('The Hacker News',      'https://feeds.feedburner.com/TheHackersNews', false),
      ('BleepingComputer',     'https://www.bleepingcomputer.com/feed/', false),
      ('Krebs on Security',    'https://krebsonsecurity.com/feed/', false),
      ('SecurityWeek',         'https://www.securityweek.com/feed/', false),
      ('Dark Reading',         'https://www.darkreading.com/rss.xml', false),
      ('The Record',           'https://therecord.media/feed', false),
      ('SANS ISC',             'https://isc.sans.edu/rssfeed_full.xml', false),
      ('Schneier on Security', 'https://www.schneier.com/feed/atom/', false),
      ('Google News',          'https://news.google.com/rss/search?q=cybersecurity+OR+cyberattack+OR+ransomware+OR+%22data+breach%22+when:7d&hl=en-US&gl=US&ceid=US:en', true)
    ) v(source, url, agg)
  loop
    n := 0;
    begin
      select * into resp from http((
        'GET', f.url,
        array[http_header('User-Agent', ua), http_header('Accept', 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*')],
        null, null)::http_request);
      if resp.status <> 200 then raise exception 'HTTP %', resp.status; end if;
      body := resp.content;
      parts := case when strpos(body, '<item') > 0 then string_to_array(body, '<item') else string_to_array(body, '<entry') end;
      for chunk in select unnest(parts[2:]) loop
        v_title := intel_clean(intel_tag(chunk, 'title'));
        v_link  := intel_clean(intel_tag(chunk, 'link'));
        if v_link is null or v_link !~ '^https?://' then v_link := substring(chunk from 'href="(https?://[^"]+)"'); end if;
        v_link := replace(v_link, '&amp;', '&');
        raw_date := coalesce(intel_tag(chunk, 'pubDate'), intel_tag(chunk, 'dc:date'), intel_tag(chunk, 'published'), intel_tag(chunk, 'updated'));
        begin v_date := btrim(raw_date)::timestamptz; exception when others then v_date := null; end;
        v_src := f.source;
        v_sum := left(intel_clean(coalesce(intel_tag(chunk, 'description'), intel_tag(chunk, 'summary'))), 240);
        if f.agg then                                    -- Google News: "Headline - Publisher"
          v_src   := coalesce(intel_clean(intel_tag(chunk, 'source')), 'Google News');
          v_title := regexp_replace(v_title, '\s+-\s+[^-]+$', '');
          v_sum   := null;
        end if;
        continue when v_title is null or v_link is null or v_date is null
                   or v_date < now() - interval '7 days' or v_date > now() + interval '1 day';
        insert into intel_items (link, source, title, summary, published)
        values (v_link, v_src, v_title, v_sum, v_date)
        on conflict (link) do update set title = excluded.title, summary = excluded.summary, fetched_at = now();
        n := n + 1;
      end loop;
      insert into intel_status (source, ok, count, error, checked_at) values (f.source, true, n, null, now())
      on conflict (source) do update set ok = true, count = n, error = null, checked_at = now();
    exception when others then
      insert into intel_status (source, ok, count, error, checked_at) values (f.source, false, 0, left(sqlerrm, 160), now())
      on conflict (source) do update set ok = false, count = 0, error = left(sqlerrm, 160), checked_at = now();
    end;
    total := total + n;
  end loop;
  delete from intel_items where published < now() - interval '7 days';
  return total;
end $$;
revoke execute on function public.intel_refresh() from public, anon, authenticated;

-- what the Intel page shows: newest 60 headlines from the last 7 days, duplicates removed
create or replace function public.intel_news() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'items', coalesce((
      select json_agg(x order by x.date desc) from (
        select * from (
          select distinct on (lower(regexp_replace(title, '[^a-zA-Z0-9]', '', 'g')))
                 source, title, link, summary, published as date
            from intel_items where published >= now() - interval '7 days'
           order by lower(regexp_replace(title, '[^a-zA-Z0-9]', '', 'g')), published desc
        ) d order by date desc limit 60
      ) x), '[]'::json),
    'sources', (select json_agg(s order by s.source) from intel_status s),
    'days', 7,
    'checked_at', (select max(checked_at) from intel_status))
  where is_member();
$$;
grant execute on function public.intel_news() to authenticated;

-- refresh every 30 minutes (skipped quietly if scheduling isn't available)
do $$
begin
  begin execute 'create extension if not exists pg_cron with schema pg_catalog'; exception when others then null; end;
  begin perform cron.unschedule('soc-intel-refresh'); exception when others then null; end;
  begin
    perform cron.schedule('soc-intel-refresh', '*/30 * * * *', 'select public.intel_refresh()');
  exception when others then
    raise notice 'Could not schedule automatic refresh: %. Enable pg_cron under Database → Extensions and run this file again.', sqlerrm;
  end;
end $$;
