/* =====================================================================
   SOC COMMAND — site settings
   Paste your Supabase project URL and anon (public) key below.
   Supabase → Project Settings → API.
   The anon key is safe to publish: the database rules decide who sees what.
   ===================================================================== */
window.SOC_SETTINGS = {
  supabaseUrl:     "https://mprsddoiulanmmjcztla.supabase.co",
  supabaseAnonKey: "sb_publishable_t8VxTY0967LlzfcP9EKMjw_OaPSXlWt",

  /* Logins are "username + password". Behind the scenes each username
     becomes username@soc.local. Must match USERNAME_DOMAIN in the server function. */
  usernameDomain: "soc.local",

  siteTitle: "SOC COMMAND",
  subtitle:  "CYBER DEFENSE TRAINING CENTER",

  /* Pixel icon for each lab category (terminal, radar, lock, envelope, shield) */
  categoryIcons: {
    Network: "radar", Crypto: "lock", Phishing: "envelope", Web: "terminal", Forensics: "shield"
  },

  /* Scrolling THREAT FEED messages */
  ticker: [
    "Clear mini-labs to earn XP",
    "Reach milestones to earn coins",
    "Diamonds are awarded by your CISO for great work",
    "Never reuse passwords",
    "Think before you click"
  ]
};
