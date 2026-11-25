// =====================================================================
// SOC COMMAND — server function "soc-api"
// Deploy: Supabase → Edge Functions → Deploy a new function → Via Editor
//         name it  soc-api  and paste this file.
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

const FEEDS = [
  { source: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
  { source: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  { source: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
  { source: "CISA", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml" },
];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ---------- news (cached 15 min per server instance) ----------
let newsCache: { at: number; items: unknown[] } | null = null;
const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
   .replace(/<[^>]+>/g, " ")
   .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#8217;/g, "’")
   .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
   .replace(/\s+/g, " ").trim();
const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};

async function news() {
  if (newsCache && Date.now() - newsCache.at < 15 * 60_000) return newsCache.items;
  const results = await Promise.allSettled(FEEDS.map(async (f) => {
    const res = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 SOC-Command" } });
    const xml = await res.text();
    return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].slice(0, 12).map(([b]) => {
      const date = new Date(tag(b, "pubDate") || tag(b, "dc:date"));
      const summary = tag(b, "description");
      return {
        source: f.source,
        title: tag(b, "title"),
        link: tag(b, "link") || (b.match(/<guid[^>]*>([^<]+)</)?.[1] ?? ""),
        date: isNaN(+date) ? null : date.toISOString(),
        summary: summary.length > 240 ? summary.slice(0, 237) + "…" : summary,
      };
    });
  }));
  const items = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((i) => i.title && i.link.startsWith("http"))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 40);
  newsCache = { at: Date.now(), items };
  return items;
}

// ---------- main ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // who is calling?
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Not signed in." }, 401);
    const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (!me || me.role === "pending") return json({ error: "Account not activated." }, 403);

    const body = await req.json().catch(() => ({}));
    if (body.action === "news") return json({ items: await news() });

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
        await admin.from("profiles").update({ role, display_name: body.display_name || username }).eq("id", data.user.id);
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
