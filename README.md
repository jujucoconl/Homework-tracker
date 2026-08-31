# Homework Tracker

A minimal-effort homework tracker: type homework in as one line, set up
repeating assignments once, and get reminded **24 hours**, **8 hours**, and
**1 hour** before each thing is due — by push notification and/or email.

## How it works

- **Quick add** — type a single line like `Math: worksheet ch 4 due fri 5pm`
  or `Chemistry lab report tomorrow`. The subject (text before a `:`), title,
  and due date/time are parsed automatically. No date mentioned? It's not
  added until you give it one. No time mentioned? It defaults to 11:59pm.
- **Repeating homework** — set a title, subject, which weekdays it's due on,
  and a due time once (e.g. "Vocab quiz, every Mon/Wed/Fri, due 3:30pm").
  The app keeps ~90 days of upcoming occurrences generated at all times, and
  tops itself up automatically.
- **Reminders** — a background check runs every 15 minutes, looks for
  incomplete tasks crossing the 24h/8h/1h-before mark, and sends a push
  notification and/or email once per task per window (never twice).
  Completing a task stops its reminders immediately. A push notification
  has a "Remind me in 1 hour" action button that snoozes it.
- **Editing** — every task can be edited in place (title, subject, due
  date/time) via the Edit button on hover (always visible on touch
  screens).
- **Undo** — completing a task shows an "Undo" toast for 5 seconds before
  it's actually saved as done.
- **Deleting** anything (a task or a repeating template) requires clicking
  twice — the button turns into "Confirm?" for 3 seconds.
- **Active / Completed tabs** — completed homework isn't gone, it's one
  tab over, with its own Undo and Delete.
- **List / Week views** — the list groups by Overdue/Today/Tomorrow/This
  week/Later; Week shows a 7-day grid with Prev/Today/Next navigation.
- **Subject filter chips** and **subject autocomplete** (quick-add
  suggestion chips + datalists in the edit and repeating-homework forms)
  keep subject names consistent instead of accumulating typo'd duplicates.
- **Manage repeating homework** — an always-visible list under the task
  list lets you pause (stops generating new occurrences, keeps existing
  ones), resume, or delete a repeating template.
- **"Send test reminder" button** — fires a real push notification and
  email right now, and reports exactly what is/isn't configured, so you
  can confirm setup without waiting for a real due date.
- **Light/dark theme toggle** — follows your system preference by
  default; the toggle in the header overrides and remembers your choice.
- **Class picker** — a dropdown of your existing classes (plus "+ Add new
  class") in quick add, the edit form, and the repeating-homework form.
  Quick add still auto-detects a class from typed text (e.g. `Math: ...`)
  when you leave the dropdown on "auto."
- **Time estimate (optional)** — a "min" box next to quick add, the edit
  form, and the repeating-homework form, purely for your own planning. If
  set, it's also used as the event duration when synced to Google Calendar
  (defaults to 30 minutes when left blank).
- **Google Calendar sync (optional)** — connect your Google account once
  and every task becomes a real event on your primary calendar: created
  when you add homework, updated when you edit it, removed when you
  delete it. Marking something complete does *not* touch its calendar
  event — the calendar keeps showing what was due at that time regardless.

## Stack

Next.js (App Router, TypeScript) + SQLite via [libSQL](https://turso.tech)
(works as a local file in dev, and as a hosted [Turso](https://turso.tech)
database in production so data survives serverless restarts) + Tailwind CSS.
No accounts/login — this is built for a single user.

## 1. Local development

```bash
npm install
npm run generate-vapid   # prints VAPID_* keys, needed for push notifications
cp .env.example .env.local
# paste the generated VAPID keys into .env.local
npm run dev
```

Open http://localhost:3000. The SQLite file is created automatically at
`./data/local.db` the first time you hit the app.

To test reminders locally without waiting for a real due date, hit the cron
endpoint directly:

```bash
curl http://localhost:3000/api/cron/check-reminders
```

(In development, `CRON_SECRET` isn't required. Add a task due in the next
25 hours first so there's something to check.)

## 2. Set up email (optional but recommended)

1. Create a free account at [resend.com](https://resend.com) and grab an API key.
2. Set `RESEND_API_KEY`, `REMINDER_EMAIL_TO` (your email), and `RESEND_FROM`
   in your env. Until you verify your own sending domain in Resend, you can
   only send to the email address on your Resend account — that's fine for
   a personal reminder tool.

## 3. Set up push notifications

Already generated your VAPID keys above with `npm run generate-vapid`. Once
they're in your env (locally and later in Vercel), open the app and click
**"Enable push reminders"**. For notifications to arrive when the app/tab is
closed, install it as a PWA (browser menu → "Install app" / "Add to Home
Screen") — this keeps the service worker alive in the background on most
platforms.

## 4. Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this from your repo).
2. Create a [Turso](https://turso.tech) database for production data (free tier):
   ```bash
   turso db create homework-tracker
   turso db show homework-tracker --url        # -> DATABASE_URL
   turso db tokens create homework-tracker      # -> DATABASE_AUTH_TOKEN
   ```
3. Import the repo into [Vercel](https://vercel.com/new).
4. In the Vercel project's **Settings → Environment Variables**, add everything
   from `.env.example`: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `VAPID_PUBLIC_KEY`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
   `RESEND_API_KEY`, `RESEND_FROM`, `REMINDER_EMAIL_TO`, and a random
   `CRON_SECRET` (e.g. `openssl rand -hex 32`).
5. Deploy.

## 5. Turn on the reminder scheduler

Vercel's free (Hobby) plan only runs its own Cron Jobs once a day, which
isn't nearly precise enough for 1-hour-before reminders. Instead, this repo
ships a **GitHub Actions workflow** (`.github/workflows/reminder-cron.yml`)
that pings your deployed reminder-check endpoint every 15 minutes, for free,
regardless of Vercel plan.

In your GitHub repo, go to **Settings → Secrets and variables → Actions**
and add two repository secrets:

- `APP_URL` — your deployed URL, e.g. `https://homework-tracker.vercel.app`
- `CRON_SECRET` — the same value you set in Vercel's env vars

That's it — the workflow is already enabled and will start firing every 15
minutes once those secrets exist. You can trigger it manually from the
Actions tab (`Run workflow`) to test it immediately after deploying.

## 6. Connect Google Calendar (optional)

This is the most involved setup step — Google gates Calendar API access
behind an OAuth app, so you need your own (free) Google Cloud project. It's
a one-time, ~10 minute setup.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create a new project (any name — e.g. "Homework Tracker").
2. **Enable the API**: APIs & Services → Library → search "Google Calendar
   API" → Enable.
3. **Configure the consent screen**: APIs & Services → OAuth consent screen.
   - User type: External.
   - Fill in the required fields (app name, your email as support/contact).
   - Scopes: you can skip adding scopes here — the app requests
     `calendar.events` directly.
   - Test users: add your own Google account email. (Since the app stays in
     "Testing" mode, only accounts you list here can authorize it — perfect
     for a personal tool, and avoids Google's app-review process entirely.)
4. **Create credentials**: APIs & Services → Credentials → Create
   Credentials → OAuth client ID.
   - Application type: Web application.
   - Authorized redirect URIs, add both:
     - `http://localhost:3000/api/calendar/callback` (for local dev)
     - `https://<your-vercel-url>/api/calendar/callback` (for production)
   - Save, then copy the **Client ID** and **Client Secret**.
5. Add to your env (locally in `.env.local`, and in Vercel's Environment
   Variables for production):
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   APP_URL=https://<your-vercel-url>
   ```
   (`APP_URL` is the same value you may have already set as a GitHub Actions
   secret for the reminder cron — here it needs to also exist as an actual
   **Vercel** environment variable, since the app itself uses it to build the
   correct OAuth redirect URL.)
6. Redeploy, then open the app and click **"Connect Google Calendar"** in
   the header. You'll go through Google's consent screen once; after that,
   homework you add, edit, or delete stays in sync automatically.

Notes on how the sync behaves:
- New tasks sync immediately. A newly created repeating series (which can
  generate dozens of occurrences at once) syncs its first 10 immediately and
  the rest within the next couple of 15-minute cron runs, so creating a
  semester's worth of recurring homework never risks a slow request.
- Disconnecting stops future syncing but does **not** delete events already
  created on your calendar — remove those from Google Calendar directly if
  you want them gone.

## Data model notes

- One-off tasks and generated occurrences of repeating homework both live in
  a single `tasks` table — completing or deleting one never touches the
  others.
- Reminders are deduplicated in a `reminder_log` table (one row per
  task × window), so re-running the check endpoint is always safe.
- Editing a task's due date clears its reminder log so the 24h/8h/1h windows
  re-evaluate against the new date.
