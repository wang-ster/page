/* =====================================================================
   SOC COMMAND — SITE DATA
   This is the ONLY file you need to edit day-to-day.
   - Add a lab:            add an entry to `labs`
   - Mark a lab complete:  add its id to a student's `completed`
   - Give diamonds:        raise a student's `diamonds`
   - Process a shop ticket: add the cost to that student's `spent`
   ===================================================================== */
window.SOC = {

  siteTitle: "SOC COMMAND",
  subtitle:  "CYBER DEFENSE TRAINING CENTER",

  /* XP a lab is worth if the lab doesn't set its own `xp` */
  defaultLabXP: 100,

  /* ---------- LEVELS & MILESTONES ----------
     xp     = total XP needed to reach this level
     rank   = title shown in the HUD
     name   = milestone name unlocked at this level
     coins  = coins granted when the milestone is reached              */
  levels: [
    { xp: 0,    rank: "Recruit",            name: "Clearance Granted",     coins: 0   },
    { xp: 100,  rank: "Trainee",            name: "Badge Issued",          coins: 50  },
    { xp: 250,  rank: "Tier 1 Analyst",     name: "First Alert Triaged",   coins: 75  },
    { xp: 450,  rank: "Tier 1 Analyst",     name: "Log Diver",             coins: 100 },
    { xp: 700,  rank: "Tier 2 Analyst",     name: "Pattern Spotter",       coins: 125 },
    { xp: 1000, rank: "Tier 2 Analyst",     name: "Phish Fryer",           coins: 150 },
    { xp: 1400, rank: "Incident Responder", name: "Containment Achieved",  coins: 200 },
    { xp: 1900, rank: "Threat Hunter",      name: "Hunter's Instinct",     coins: 250 },
    { xp: 2500, rank: "Threat Hunter",      name: "Adversary Mindset",     coins: 300 },
    { xp: 3200, rank: "SOC Lead",           name: "Command Authority",     coins: 500 }
  ],

  /* Pixel icon used for each lab category (terminal, radar, lock, envelope, shield) */
  categoryIcons: {
    Network:   "radar",
    Crypto:    "lock",
    Phishing:  "envelope",
    Web:       "terminal",
    Forensics: "shield"
  },

  /* ---------- MINI-LABS ----------
     Put the HTML files in the /labs folder and point `file` at them.
     file: null  → shows as CLASSIFIED (not released yet)
     threat: 1–3 → difficulty pips                                     */
  labs: [
    { id: "LAB-01", title: "Port Scan Recon",          category: "Network",   threat: 1, xp: 100, date: "2026-09-08",
      desc: "Map open ports on a simulated host and identify the services.", file: "labs/example-lab.html" },
    { id: "LAB-02", title: "Password Strength Tester", category: "Crypto",    threat: 1, xp: 100, date: "2026-09-15",
      desc: "Measure entropy and see how fast weak passwords fall.",        file: null },
    { id: "LAB-03", title: "Spot the Phish",           category: "Phishing",  threat: 1, xp: 150, date: "2026-09-22",
      desc: "Triage an inbox and flag the malicious emails.",               file: null },
    { id: "LAB-04", title: "Caesar & Vigenère",        category: "Crypto",    threat: 2, xp: 150, date: "2026-10-06",
      desc: "Encrypt, decrypt, and break classical ciphers.",               file: null },
    { id: "LAB-05", title: "Brute Force in the Logs",  category: "Forensics", threat: 2, xp: 200, date: "2026-10-20",
      desc: "Hunt a brute-force attack through authentication logs.",       file: null },
    { id: "LAB-06", title: "XSS Playground",           category: "Web",       threat: 3, xp: 250, date: "2026-11-10",
      desc: "Find and fix cross-site scripting in a toy web app.",          file: null }
  ],

  /* ---------- SUPPLY SHOP ----------
     currency: "coins" or "diamonds"
     icon: chips, candy, ticket, clock, music, star, shield, chest      */
  shop: [
    { id: "candy",    name: "Candy",                   desc: "One piece from the candy bin.",                  icon: "candy",  currency: "coins",    cost: 75  },
    { id: "chips",    name: "Bag of Chips",            desc: "One small bag of chips.",                        icon: "chips",  currency: "coins",    cost: 150 },
    { id: "seat",     name: "Pick Your Seat",          desc: "Sit anywhere for one class period.",             icon: "star",   currency: "coins",    cost: 200 },
    { id: "music",    name: "Music During Lab",        desc: "Headphones allowed during one lab.",             icon: "music",  currency: "coins",    cost: 250 },
    { id: "theme",    name: "Choose a Lab Scenario",   desc: "Pick the story theme for an upcoming lab.",      icon: "shield", currency: "coins",    cost: 400 },
    { id: "late",     name: "Late Pass",               desc: "Turn in one assignment a day late, no penalty.", icon: "clock",  currency: "diamonds", cost: 2   },
    { id: "hwpass",   name: "Homework Pass",           desc: "Skip one homework assignment.",                  icon: "ticket", currency: "diamonds", cost: 3   },
    { id: "bonus",    name: "+5 Bonus Points",         desc: "Five extra points on one quiz.",                 icon: "chest",  currency: "diamonds", cost: 5   }
  ],

  /* ---------- ROSTER ----------
     Use CALLSIGNS, not real names — this site is public on GitHub Pages.
     completed  = lab ids the student has finished (grants XP)
     diamonds   = total diamonds you've awarded
     bonusXP / bonusCoins = optional manual adjustments
     spent      = what they've redeemed in the shop                    */
  roster: [
    { callsign: "GHOST",    completed: ["LAB-01", "LAB-02", "LAB-03"],                               diamonds: 3, spent: { coins: 0,   diamonds: 0 } },
    { callsign: "NIGHTOWL", completed: ["LAB-01", "LAB-02", "LAB-03", "LAB-04", "LAB-05", "LAB-06"], diamonds: 5, spent: { coins: 150, diamonds: 2 } },
    { callsign: "CIPHER",   completed: ["LAB-01"],                                                   diamonds: 0, spent: { coins: 0,   diamonds: 0 } }
  ],

  /* ---------- INTEL BRIEFINGS (the mailbox) ---------- */
  briefings: [
    { date: "2026-11-24", title: "Welcome to SOC Command", body: "Pick your callsign from the operator menu (click the portrait) to see your rank and wallet." },
    { date: "2026-11-24", title: "Shop is open",           body: "Spend coins and diamonds in the Supply Shop. Show your requisition ticket to redeem." }
  ],

  /* ---------- THREAT FEED (scrolling ticker) ---------- */
  ticker: [
    "New mini-labs drop as they're released",
    "Reach milestones to earn coins",
    "Diamonds are awarded by your instructor for great work",
    "Never reuse passwords",
    "Think before you click"
  ]
};
