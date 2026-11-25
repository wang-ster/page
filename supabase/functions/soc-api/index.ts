// =====================================================================
// SOC COMMAND — server function "soc-api"
// Deploy: Supabase → Edge Functions → Deploy a new function → Via Editor
//         name it  soc-api  and paste this file. Then open the function's
//         settings and turn OFF "Verify JWT" (this code checks the login itself).
// Accounts are managed in the database now (supabase/user-admin.sql);
// the Console only uses this function for the Intel news feed.
//
// Actions:
//   news            (any member)  latest cybersecurity headlines for Intel
//   create_user     (CISO)        make a student/CISO login
//   reset_password  (CISO)        set a new password for anyone
//   set_role        (CISO)        analyst / ciso / pending
//   delete_user     (CISO)        remove a login and all its data
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

// Must match usernameDomain in assets/settings.js
const USERNAME_DOMAIN = "soc.local";

// News sources for Intel. Each is fetched on the server; any that fail are skipped.
// Google News is a backstop that aggregates many outlets.
const NEWS_DAYS = 7;
const FEEDS = [
  { source: "CISA", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml" },
  { source: "CISA News", url: "https://www.cisa.gov/news.xml" },
  { source: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
  { source: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  { source: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
  { source: "SecurityWeek", url: "https://www.securityweek.com/feed/" },
  { source: "Dark Reading", url: "https://www.darkreading.com/rss.xml" },
  { source: "The Record", url: "https://therecord.media/feed" },
  { source: "SANS ISC", url: "https://isc.sans.edu/rssfeed_full.xml" },
  { source: "Schneier on Security", url: "https://www.schneier.com/feed/atom/" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=cybersecurity+OR+cyberattack+OR+ransomware+OR+%22data+breach%22+when:7d&hl=en-US&gl=US&ceid=US:en", aggregator: true },
];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ---------- news (cached 15 min per server instance; empty results are never cached) ----------
type Item = { source: string; title: string; link: string; date: string | null; summary: string };
let newsCache: { at: number; body: unknown } | null = null;
const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
   .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")   // some feeds double-encode HTML
   .replace(/<[^>]+>/g, " ")
   .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
   .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
   .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
   .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
   .replace(/\s+/g, " ").trim();
const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};

// Parses RSS (<item>) and Atom (<entry>) feeds.
function parseFeed(xml: string, feed: { source: string; aggregator?: boolean }): Item[] {
  const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return blocks.map((b) => {
    const rawDate = tag(b, "pubDate") || tag(b, "dc:date") || tag(b, "published") || tag(b, "updated");
    const d = new Date(rawDate);
    let link = tag(b, "link");
    if (!link.startsWith("http")) link = b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? b.match(/<guid[^>]*>(https?:[^<]+)</i)?.[1] ?? "";
    let title = tag(b, "title");
    let source = feed.source;
    if (feed.aggregator) {                                  // Google News: "Headline - Publisher"
      const pub = tag(b, "source");
      if (pub) { source = pub; title = title.replace(new RegExp(`\\s+-\\s+${pub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), ""); }
    }
    let summary = feed.aggregator ? "" : (tag(b, "description") || tag(b, "summary") || tag(b, "content"));
    if (summary.length > 240) summary = summary.slice(0, 237) + "…";
    return { source, title, link: link.replace(/&amp;/g, "&"), date: isNaN(+d) ? null : d.toISOString(), summary };
  });
}

async function news() {
  if (newsCache && Date.now() - newsCache.at < 15 * 60_000) return newsCache.body;
  const since = Date.now() - NEWS_DAYS * 86_400_000;
  const status: { source: string; ok: boolean; count: number; error?: string }[] = [];
  const lists = await Promise.all(FEEDS.map(async (f) => {
    try {
      const res = await fetch(f.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseFeed(await res.text(), f)
        .filter((i) => i.title && i.link.startsWith("http") && i.date && Date.parse(i.date) >= since);
      status.push({ source: f.source, ok: true, count: items.length });
      return items;
    } catch (e) {
      status.push({ source: f.source, ok: false, count: 0, error: String((e as Error)?.message ?? e).slice(0, 80) });
      return [];
    }
  }));
  // newest first, drop duplicate headlines (the same story often appears in several feeds)
  const seen = new Set<string>();
  const items = lists.flat()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .filter((i) => { const k = i.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 60);
  const body = { items, days: NEWS_DAYS, sources: status, fetched_at: new Date().toISOString() };
  if (items.length) newsCache = { at: Date.now(), body };
  return body;
}

// ---------- main ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    // works with both the legacy service_role key and the new sb_secret_ keys
    let secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    try { secret = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default || secret; } catch (_) { /* keep legacy */ }
    const admin = createClient(url, secret);

    // who is calling?
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Not signed in." }, 401);
    const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (!me || me.role === "pending") return json({ error: "Account not activated." }, 403);

    const body = await req.json().catch(() => ({}));
    if (body.action === "news") return json(await news());

    if (me.role !== "ciso") return json({ error: "CISO clearance required." }, 403);

    switch (body.action) {
      case "create_user": {
        const username = String(body.username ?? "").toLowerCase().trim();
        if (!/^[a-z0-9._-]{2,32}$/.test(username))
          return json({ error: "Username: 2–32 letters, numbers, dots, dashes or underscores." }, 400);
        if (String(body.password ?? "").length < 6)
          return json({ error: "Password must be at least 6 characters." }, 400);
        const role = body.role === "ciso" ? "ciso" : "analyst";
        const { data, error } = await admin.auth.admin.createUser({
          email: `${username}@${USERNAME_DOMAIN}`,
          password: body.password,
          email_confirm: true,
          user_metadata: { display_name: body.display_name || username },
        });
        if (error) return json({ error: error.message.includes("already") ? "That username is taken." : error.message }, 400);
        const { error: pErr } = await admin.from("profiles").update({ role, display_name: body.display_name || username }).eq("id", data.user.id);
        if (pErr) return json({ error: `Login created, but activating it failed: ${pErr.message}` }, 500);
        return json({ ok: true, id: data.user.id });
      }
      case "reset_password": {
        if (String(body.password ?? "").length < 6)
          return json({ error: "Password must be at least 6 characters." }, 400);
        const { error } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
      case "set_role": {
        if (!["analyst", "ciso", "pending"].includes(body.role)) return json({ error: "Bad role." }, 400);
        if (body.user_id === user.id) return json({ error: "You can't change your own role." }, 400);
        const { error } = await admin.from("profiles").update({ role: body.role }).eq("id", body.user_id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
      case "delete_user": {
        if (body.user_id === user.id) return json({ error: "You can't delete yourself." }, 400);
        const { error } = await admin.auth.admin.deleteUser(body.user_id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
