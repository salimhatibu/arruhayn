# الرُّحَين · Arruhayn

Fatwas on marriage, newsletters, and live classes, in Arabic and English. Built with Payload CMS
and Next.js, and hosted entirely on Cloudflare Workers.

- **Public site:** fatwa archive in 12 marriage topics with Arabic/English search, ask-a-question
  form, newsletters, news, guides with a nikah checklist, glossary pop-ups, audio library with
  resume and an RSS feed, Hijri calendar with Sunnah fasting days and calendar feeds, live classes,
  and bookmarks saved in the browser.
- **Staff side:** email and password sign-in (Cloudflare Access optional), with admin, reviewer, and teacher roles. Teachers host
  live classes with screen sharing and record them to their own computer.

See [docs/SETUP.md](docs/SETUP.md) for the dashboard steps, deploying, and operations.

## Running it on your computer

You need Node 24.22 or newer (see `.node-version`) and pnpm. Check with `node -v`. If it shows an
older version, install Node 24 with your version manager (for example `nvm install 24`), or put a
downloaded Node 24 first on your `PATH`:

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

4. Load the topics, glossary, and guides, and make yourself an admin:

   ```bash
   pnpm seed you@example.com "Your Name"
   ```

   Add `SEED_SAMPLES=1` in front to also create clearly marked sample newsletters, news, and a
   class for trying the site out. Never use it on production.

5. Import the marriage fatwas from Q&A Benefits (takes a minute or two):

   ```bash
   pnpm import:qab
   ```

### Every time

```bash
pnpm dev
```

Then open:

- http://localhost:3000 for the public site (English at `/en`, Arabic at `/ar`)
- http://localhost:3000/admin for the admin. While `DEV_STAFF_EMAIL` is set in `.env`, you are
  signed in automatically as that staff member. To use the real login form instead, empty
  `DEV_STAFF_EMAIL`, give yourself a password, and sign in with your email and that password:

  ```bash
  read -rs STAFF_PASSWORD && export STAFF_PASSWORD
  pnpm set-password you@example.com
  ```

Stop it with `Ctrl+C`. The local database lives in `.wrangler/` and is separate from production,
so nothing you do with `pnpm dev` changes the live site. (`pnpm preview` is different: it uses the
production database. Only use it when you mean to.)

## Layout

| Path | What it is |
| --- | --- |
| `worker.ts` | Worker entry: blocks staff routes on the public Worker, runs scheduled jobs |
| `wrangler.jsonc` | Local dev at the top level; `public` and `admin` environments for production |
| `src/collections/` | CMS collections (fatwas, topics, newsletters, classes, and so on) |
| `src/access/roles.ts` | Admin, reviewer, and teacher permissions |
| `src/auth/cloudflare-access.ts` | Optional staff sign-in from a Cloudflare Access token |
| `src/app/(frontend)/[locale]/` | Public pages in `/en` and `/ar` |
| `src/app/(staff)/teach/` | Teacher's live room (admin Worker only) |
| `src/app/svc/` | Form, live-class, upload, and jobs endpoints |
| `src/lib/hijri.ts`, `fasting.ts`, `ics.ts` | Hijri dates, Sunnah fasts, calendar feeds |
| `src/lib/search-index.ts`, `arabic.ts` | Full-text search with Arabic normalization |
| `src/components/live/` | Live room and local recorder |
| `content/` | Starter topics, glossary, and guides loaded by `pnpm seed` |
| `src/fonts/` | Amiri, Amiri Quran, and Crimson Pro (OFL), subset for the web |

## Checks

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:int
```
