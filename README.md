# SOC Command: Setup & Instructor Guide

A cybersecurity class site, hosted on GitHub Pages with Supabase behind it for logins and data.

- **CISO** (you): full control from the **Console**. You create and delete students, reset passwords, upload labs, grade work, award diamonds, run the shop, post announcements and edit ranks.
- **Analysts** (students): log in, play labs, submit work and spend rewards. They can only change their own lab progress and submissions.
- There's no sign-up page. Only accounts you create can get in.

---

## One-time setup (~15 minutes)

### 1. Create the Supabase project
1. Go to **supabase.com** and sign up (free). Click **New project**, give it a name and a database password, and wait for it to finish.
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and click **Run**.
3. Under **Authentication → Sign In / Providers**:
   - Turn **OFF** "Allow new users to sign up".
   - Under **Email**, turn **OFF** "Confirm email".

### 2. Turn on account management
In **SQL Editor → New query**, paste all of `supabase/user-admin.sql` and click **Run**.
This lets the Console create students, reset passwords, change roles and delete accounts by itself.

### 2b. (Optional) Intel news feed
The Intel page needs one Edge Function. Everything else works without it.
1. Go to **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly **`soc-api`**.
3. Replace the sample code with all of `supabase/functions/soc-api/index.ts`, then click **Deploy**.
4. Open the function's settings and turn **OFF "Verify JWT"**. The code checks the login itself.

### 3. Connect the website
1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Paste both into `assets/settings.js` and commit the change.

The anon key is designed to be public. The database rules decide what each person can see.

### 4. Make your own CISO account
1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
   - Email: `yourname@soc.local` (for example `mrwang@soc.local`).
   - Pick a password and tick **Auto Confirm User**.
2. In the **SQL Editor**, run:
   ```sql
   update profiles set role = 'ciso' where username = 'mrwang';
   ```
3. Log in on the site with the username `mrwang` and your password.

### 5. First run
1. Open **Console → Labs** and click **Import starter labs**. This adds the Network Isolation Lab.
2. Open **Console → Operators** and create your students. Bulk create lets you add a whole class at once.
3. Optional: delete the `starter-labs/` folder from the repo afterwards. Files in the repo are public; uploaded labs live in the database behind the login.

---

## Everyday use (all in the Console)

| Task | Where |
|---|---|
| Add a new mini-lab | **Labs → Upload**: pick the `.html` file and click Upload & Publish. It's live right away. |
| Hide or show a lab | **Labs →** click LIVE / DRAFT |
| Grade work | **Gradebook**: View Work shows written answers; enter a grade and feedback, then Release Grade |
| Let a student redo a graded lab | **Gradebook → Reopen** |
| Award a diamond | **Operators →** the + button |
| Reset a password | **Operators → Reset PW** |
| Hand out a shop reward | **Requisitions → Fulfill** (Deny refunds the student) |
| Post to students | **Announcements** |
| Change XP levels or coin rewards | **Ranks** |

## How ranks work
1. Each lab is worth XP, which the student earns when they **submit** it.
2. Total XP sets their **level**. Every new level is a **milestone** that pays **coins** once.
3. Coins and diamonds are spent in the **Supply Shop**. A purchase creates a ticket, and the cost is held until you fulfill or deny it.
4. Diamonds only come from you.

## Making labs that report a score (optional)
Any HTML lab works as-is, and its saved progress follows the student between devices. A lab can also report a score to the gradebook with:
```js
if (window.SOC_LAB) SOC_LAB.progress({ score: 40, max: 100 });            // live score
if (window.SOC_LAB) SOC_LAB.complete({ score: 40, max: 100, answers: {} }); // auto-submit
```

## Security notes (good class discussion material)
- Uploaded labs run in a sandboxed frame, so a lab can't read anyone's login.
- Balances are checked by the database, so editing the page in the browser can't buy anything.
- Submitting is honor-system: a determined student could submit without doing the work. Your gradebook review is the check.
