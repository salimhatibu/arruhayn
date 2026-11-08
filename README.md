# الرُّحَين · Arruhayn

Fatwas on marriage, newsletters, and live classes, in Arabic and English. Built with Payload CMS
and Next.js, and hosted entirely on Cloudflare Workers.

| | Address |
| --- | --- |
| Public site | https://arruhayn.salimhatibu786.workers.dev |
| Staff desk (admin) | https://arruhayn-admin.salimhatibu786.workers.dev |

The dashboard steps (live classes, recording uploads, your own domain, email) are in
[docs/SETUP.md](docs/SETUP.md).

## What's in it

**Public site** (`/en` and `/ar`, right to left in Arabic)

- **Front page:** a full-screen intro with search and topic buttons, then a newspaper front page:
  lead fatwa, side stories, an almanac with today's Hijri date and the next Sunnah fast, numbered
  stories, topics with counts, recent newsletters and news, upcoming classes, and newsletter sign-up.
- **Fatwas:** the archive in 12 marriage topics, filterable by topic and scholar. Search is on the
  same page and works in Arabic or English, ignoring diacritics; topic words act as synonyms
  ("dowry" finds mahr). 73 fatwas were imported from Q&A Benefits with permission, each crediting
  the scholar, translator, and original post.
- **Ask a question:** a private form for reviewers, protected by Turnstile.
- **Newsletters, news, guides** (with a nikah checklist saved on the device), and a **glossary**
  whose terms show definitions when tapped or hovered in any article.
- **Library:** a listening room with large controls, speed, skip, a seek bar, resume where you
  stopped, and a listened count. Also an RSS feed.
- **Calendar:** Gregorian and Hijri dates, Islamic occasions, Sunnah fasts, and classes. On phones
  the grid shows dots and the month's dates are listed underneath. Three calendar feeds (Google,
  Apple, or an ICS file) cover the next 12 months.
- **Live classes:** listen in the browser, raise a hand to speak.
- **Saved:** save any fatwa, newsletter, guide, or recording; everything saved is listed newest
  first. Create named lists, then add saved items to them, and share a list as a link. All of
  this stays in the visitor's browser.
- **Share** buttons everywhere: the phone's share sheet, or copy link, WhatsApp, Telegram, X,
  Facebook, and email.

**Staff desk** (admin Worker)

- Email and password sign-in; an account locks for 15 minutes after five wrong attempts.
  Cloudflare Access can be added later as an extra layer.
- Roles: **admin** (everything, including staff), **reviewer** (fatwas, questions, publishing),
  and **teacher** (their own classes and recordings).
- Dashboard with today's numbers; every list has status tabs with counts, Export CSV, bulk select,
  edit and delete, status pills, and 10/25/50/100/200 rows per page.
- Questions become draft fatwas with one tick; publishing marks the question answered.
- Teachers run live classes with screen sharing and record to their own computer, then upload
  the recording (converted to MP3 in the browser).
- Every 15 minutes the admin Worker publishes scheduled newsletters, deletes questions 90 days
  after they are answered, and ends classes left live by mistake.

## Running it on your computer

You need Node 24.22 or newer (see `.node-version`) and pnpm. Check with `node -v`. If it shows an
older version, install Node 24 (for example `nvm install 24`), or put a downloaded Node 24 first on
your `PATH` in that terminal:

```bash
export PATH=$HOME/.local/share/node-v24.22.2-linux-x64/bin:$PATH
```

### First time only

1. Install the packages:

   ```bash
   pnpm install
   ```

2. Create your settings file, then open `.env` and fill in `PAYLOAD_SECRET` (any long random
   string, for example from `openssl rand -hex 32`) and `DEV_STAFF_EMAIL` (your email):

   ```bash
   cp .env.example .env
   ```

3. Create the local database:

   ```bash
   pnpm payload migrate
   ```

4. Load the topics, glossary, and guides, and make yourself an admin. Add `SEED_SAMPLES=1` in
   front to also create clearly marked sample content for trying things out (never on production):

   ```bash
   pnpm seed you@example.com "Your Name"
   ```

5. Import the marriage fatwas from Q&A Benefits (takes a minute or two):

   ```bash
   pnpm import:qab
   ```

### Every time

```bash
pnpm dev
```

- Public site: http://localhost:3000 (`/en` and `/ar`)
- Staff desk: http://localhost:3000/admin. While `DEV_STAFF_EMAIL` is set in `.env` you are signed
  in automatically as that person. To use the real sign-in screen instead, empty
  `DEV_STAFF_EMAIL`, restart `pnpm dev`, and give yourself a local password (see below, without the
  `CLOUDFLARE_ENV` and `NODE_ENV` parts).

Stop it with `Ctrl+C`. The local database lives in `.wrangler/` and is separate from production,
so nothing you do with `pnpm dev` changes the live site. (`pnpm preview` is different: it uses the
production database.)

## Staff passwords

Passwords are set from the terminal, so they never appear in the command or in your shell
history. These two commands work in both zsh and bash. The first waits for you to type the password
(nothing shows as you type; at least 12 characters) and press Enter:

```bash
read -rs STAFF_PASSWORD
```

```bash
STAFF_PASSWORD="$STAFF_PASSWORD" CLOUDFLARE_ENV=admin NODE_ENV=production pnpm set-password you@example.com; unset STAFF_PASSWORD
```

You'll see `Password set for you@example.com`. Use the same commands to reset a forgotten password
or unlock an account. To add a staff member, an admin creates them under **Settings → Staff** in the
staff desk (with a password, or set one with the commands above).

## Content scripts

| Command | What it does |
| --- | --- |
| `pnpm seed you@example.com "Your Name"` | Loads topics, glossary, and guides; creates the first admin |
| `pnpm import:qab` | Imports or updates the Q&A Benefits marriage fatwas (safe to run again) |
| `DRY_RUN=1 pnpm import:qab` | Lists what the import would do without changing anything |
| `pnpm reindex` | Rebuilds the search index |
| `pnpm set-password you@example.com` | Sets a staff password (see above) |

Each runs against your local database. Put `CLOUDFLARE_ENV=admin NODE_ENV=production` in front to
run it against production.

## Deploying

```bash
CLOUDFLARE_ENV=admin pnpm run deploy:database
```

applies any new database changes to production (run it first whenever `src/migrations/` changed).

```bash
pnpm run deploy:all
```

builds once and deploys both Workers. The same build serves both: the public Worker refuses staff
routes (`/admin`, `/api`, `/teach`, `/svc/staff`), and the admin Worker sends its bare address to
`/admin` and public pages to the public site.

## Layout

| Path | What it is |
| --- | --- |
| `worker.ts` | Worker entry: route rules for each Worker, and the 15-minute jobs |
| `wrangler.jsonc` | Local dev at the top level; `public` and `admin` environments for production |
| `src/collections/` | CMS collections (fatwas, topics, newsletters, classes, and so on) |
| `src/payload.config.ts` | Payload setup, including the list-page features added to every collection |
| `src/access/roles.ts` | Admin, reviewer, and teacher permissions |
| `src/auth/cloudflare-access.ts` | Optional sign-in through Cloudflare Access, and local auto sign-in |
| `src/app/(frontend)/[locale]/` | Public pages in `/en` and `/ar` |
| `src/app/(payload)/custom.scss` | The staff desk's look |
| `src/app/(staff)/teach/` | Teacher's live room (admin Worker only) |
| `src/app/svc/` | Form, live-class, upload, CSV export, and jobs endpoints |
| `src/app/media/` | Serves images and recordings from R2, with seeking |
| `src/components/site/` | Public-site components (front page pieces, listening room, share, saved lists) |
| `src/components/admin/` | Staff-desk components (sidebar, dashboard, list tabs, status pills, sign-in) |
| `src/components/live/` | Live room and local recorder |
| `src/lib/hijri.ts`, `fasting.ts`, `ics.ts` | Hijri dates, Sunnah fasts, calendar feeds |
| `src/lib/search-index.ts`, `arabic.ts` | Full-text search with Arabic normalization |
| `src/i18n/dictionary.ts` | Interface wording in English and Arabic |
| `src/styles/site.css` | The public site's look |
| `scripts/` | Seed, Q&A Benefits import, reindex, and set-password |
| `content/` | Starter topics, glossary, and guides loaded by `pnpm seed` |
| `public/art/` | The hero illustration pieces |
| `src/fonts/` | Amiri, Amiri Quran, and Crimson Pro (OFL), subset for the web |

## Checks

```bash
pnpm exec tsc --noEmit
```

```bash
pnpm lint
```

```bash
pnpm test:int
```
