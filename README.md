# SOC Command: Instructor Guide

Your class site for GitHub Pages. After setup, you only edit **`data/config.js`**.

```
index.html          main menu
labs.html           mini-lab archive
milestones.html     ranks & milestone rewards
shop.html           supply shop
data/config.js      ← labs, students, shop items, levels, briefings
assets/             theme + engine (no need to touch)
labs/               put your mini-lab .html files here
```

## Setup
1. Upload everything in this folder to the root of your GitHub repo.
2. Go to repo **Settings → Pages**. Choose "Deploy from a branch", then pick `main` and `/ (root)`.

## Common tasks (all in `data/config.js`)

**Add a lab.** Copy the file into `labs/`, then add this to `labs`:
```js
{ id: "LAB-07", title: "SQL Injection 101", category: "Web", threat: 2, xp: 150,
  date: "2026-12-01", desc: "One-line summary.", file: "labs/sqli-101.html" },
```
Use `file: null` to show a lab as CLASSIFIED (coming soon).

**A student completes a lab.** Add the lab id to their `completed` list. XP, level, milestone coins and the LABS bar all update from that.

**Award diamonds.** Raise their `diamonds` number.

**A student redeems a shop ticket.** Add the cost to their `spent` (`coins` or `diamonds`). Before you hand over the reward, check that they could afford it on the site.

**Manual adjustments.** Optionally add `bonusXP: 50` or `bonusCoins: 25` to a student.

**Announcements.** Add to `briefings` (the mailbox) or `ticker` (the scrolling feed).

## Good to know
- **Use callsigns, not real names.** GitHub Pages sites are public, and anyone can read `config.js`.
- Students pick their callsign from the portrait menu. Picking one only changes whose stats the page shows, so students can look up each other's progress.
- Students can't change their own coins, because the numbers only come from your file. If someone edits the page in their browser, only their own screen changes. (That makes a nice teachable moment.)
- Add a back button to any lab with `<a href="../labs.html">◀ RETURN TO SOC</a>`.
