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

### 2. Run the add-on scripts
In **SQL Editor → New query**, run each of these files in order (paste all of it, click **Run**):
1. `supabase/user-admin.sql`: lets the Console create students, reset passwords, change roles and delete accounts.
2. `supabase/update-character-grades.sql`: one-time lab submission with CISO unlock, plus the Character Chart.
3. `supabase/update-lab-builder.sql`: the Lab Builder, screenshot uploads and live progress.
4. `supabase/intel-news.sql`: the Intel news feed. The database fetches cybersecurity news every 30 minutes.
   Then run this as its own query to fetch the first batch now: `select public.intel_refresh();`

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
| Let a student resubmit a lab | **Gradebook → Unlock resubmit** (students can only submit once otherwise) |
| Award a diamond | **Operators →** the + button |
| Reset a password | **Operators → Reset PW** |
| Hand out a shop reward | **Requisitions → Fulfill** (Deny refunds the student) |
| Post to students | **Announcements** page (the form at the top is only visible to you) |
| Change XP levels or coin rewards | **Ranks** |

## Lab Builder, Live Monitor and review
- **Build a lab:** go to **Console → Labs → Open Lab Builder**. Add **Instructions**, **Questions** (open response, with points) and **Screenshot uploads**, in any order. The right side previews exactly what students see. **Save & Publish** makes it live.
- **Lock / unlock:** tick **Locked** on any block to hide it until you're ready. Unlock it in the builder or with one click in the Live Monitor; students see it within 15 seconds.
- **Live Monitor:** go to **Console → Live Monitor**, or **Monitor** next to any lab. Every student shows their status, progress and last activity, refreshing every 5 seconds.
- **Watch one student:** click their card to see their lab exactly as they have it: answers, screenshots, or, for uploaded HTML labs, the lab itself replayed with their progress. **Live progress** updates every 5 seconds; **Submitted version** shows what they turned in. Grade and unlock resubmission from the same screen.
- **Gradebook → View work** opens the same view for that submission.

Students can paste a screenshot (**Ctrl+V**), drag it in, or choose a file. Screenshots are private: only that student and you can see them.

## Student View (CISO)
Click **👁 View as student** in the Console (or **gear → View as student**). The site switches to exactly what a brand-new student sees:
- no Console or Character Chart
- zero XP and coins
- draft labs hidden and locked questions locked

You can click through labs, type answers and try uploads, but nothing is saved, submitted or bought. A striped bar at the top reminds you; click **Exit Student View** to return. It only affects that browser tab, and opening any CISO page ends it automatically.

## Backgrounds (everyone)
Click the **gear → Background** to choose a scene (SOC Room, Calm Grid, Night Sky, Minimal), a color, how much to dim it, and whether it animates. **My image** turns any uploaded picture into pixel art (Chunky / Medium / Fine). Settings are saved for each user on that device, so students on shared computers each keep their own.

## Character Chart (CISO only)
Open **Character** in the bottom bar.
1. Everyone starts at **S** (0 points) each day.
2. Tap a student's buttons as things happen, for example **+2 Active participation** or **−1 Distracted**. Their grade updates live: **E** at +3 or more, **U** at −3 or less.
3. Mark **A** (absent) or **A/x** (excused absence) to replace the grade. **Override** sets E/S/U by hand.
4. **Undo** removes the last mark; **Log** shows every mark with its time and lets you add a note.
5. **End-of-day summary** lists every student and their grade. Copy names + grades for your gradebook, download a CSV, or print it.

Change the buttons, their points and the E/U thresholds under **Factors & Rules**. Pick another date to look back at a previous day.

## How ranks work
1. Each lab is worth XP, which the student earns when they **submit** it. Each lab can be submitted once unless you unlock it.
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
