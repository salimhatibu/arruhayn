# الرُّحَين · Arruhayn

Fatwas on marriage, newsletters, and live classes, in Arabic and English. Built with Payload CMS
and Next.js, and hosted entirely on Cloudflare Workers.

- **Public site:** fatwa archive in 12 marriage topics with Arabic/English search, ask-a-question
  form, newsletters, news, guides with a nikah checklist, glossary pop-ups, audio library with
  resume and an RSS feed, Hijri calendar with Sunnah fasting days and calendar feeds, live classes,
  and bookmarks saved in the browser.
- **Staff side:** behind Cloudflare Access, with admin, reviewer, and teacher roles. Teachers host
  live classes with screen sharing and record them to their own computer.

See [docs/SETUP.md](docs/SETUP.md) for the dashboard steps, deploying, and operations.

## Local development

Requires Node 24.22+ (see `.node-version`) and pnpm.

```bash
pnpm install
cp .env.example .env          # set PAYLOAD_SECRET and DEV_STAFF_EMAIL
pnpm payload migrate          # create the local database
SEED_SAMPLES=1 pnpm seed you@example.com "Your Name"
pnpm dev
```

Open http://localhost:3000. Locally you are signed in to `/admin` as `DEV_STAFF_EMAIL`, standing
in for Cloudflare Access. `SEED_SAMPLES=1` adds clearly marked sample content; never use it on
production.

## Layout

| Path | What it is |
| --- | --- |
| `worker.ts` | Worker entry: blocks staff routes on the public Worker, runs scheduled jobs |
| `wrangler.jsonc` | Local dev at the top level; `public` and `admin` environments for production |
| `src/collections/` | CMS collections (fatwas, topics, newsletters, classes, and so on) |
| `src/access/roles.ts` | Admin, reviewer, and teacher permissions |
| `src/auth/cloudflare-access.ts` | Staff sign-in from the Cloudflare Access token |
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
