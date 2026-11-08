# Arruhayn setup and operations

This guide covers the steps that need the Cloudflare dashboard, plus everyday operations.
The code, databases, storage bucket, and both Workers are already created.

| Worker | Address | Purpose |
| --- | --- | --- |
| `arruhayn` | https://arruhayn.salimhatibu786.workers.dev | Public site |
| `arruhayn-admin` | https://arruhayn-admin.salimhatibu786.workers.dev | Staff admin, teacher live room, scheduled jobs |

Both use the D1 database `arruhayn-db` and the R2 bucket `arruhayn-media`. Local development uses
`arruhayn-db-dev` (a local copy).

Secrets are set per Worker with:

```bash
npx wrangler secret put NAME --env admin
```

and again with `--env public` where the table says both.

## 1. Protect the admin Worker with Cloudflare Access (required before inviting staff)

Until this is done nobody can sign in to the admin, so the staff side stays closed.

1. Dashboard → **Zero Trust**. If asked, choose a team name (for example `arruhayn`) and the Free plan.
2. Zero Trust → **Settings → Authentication**: make sure **One-time PIN** is enabled.
3. Dashboard → **Workers & Pages → arruhayn-admin → Settings → Domains & Routes**. On the
   `workers.dev` row, turn on **Cloudflare Access**. Do the same for **Preview URLs**.
4. Zero Trust → **Access → Applications**: open the application that was just created.
   - Create an Access group `arruhayn-staff` (Access → Access groups) with the staff emails.
   - Set the application's policy to **Allow** → Include → Access group `arruhayn-staff`.
   - Session duration: 24 hours.
   - Copy the **Application Audience (AUD) Tag**.
5. Set the secrets on the admin Worker:

   | Secret | Value |
   | --- | --- |
   | `ACCESS_TEAM_DOMAIN` | `<team>.cloudflareaccess.com` |
   | `ACCESS_AUD` | the AUD tag |

6. Create the first admin (an email that's in the Access group):

   ```bash
   CLOUDFLARE_ENV=admin NODE_ENV=production pnpm seed you@example.com "Your Name"
   ```

   This also loads the 12 topics, 25 glossary terms, and 3 guides. Add other staff from the
   admin under **Settings → Staff**, and add their emails to the `arruhayn-staff` Access group.

## 2. Live classes (RealtimeKit)

1. Dashboard → **Realtime → RealtimeKit** → create an app. It comes with the `webinar_presenter`
   and `webinar_viewer` presets the site uses. Note the **App ID**.
2. Dashboard → **My Profile → API Tokens** → create a token with **Account → Realtime → Edit**
   (or Realtime Admin) for this account.
3. Set on **both** Workers:

   | Secret | Value |
   | --- | --- |
   | `RTK_ACCOUNT_ID` | `94e09a58e9e025aa99f33049b3bd184a` |
   | `RTK_APP_ID` | the app ID |
   | `RTK_API_TOKEN` | the API token |

Teachers start a class from the admin: **Classes → (class) → Open the live room**. Use desktop
Chrome or Edge for screen sharing and recording. Run a two-hour test class before the first real one.

## 3. Uploading recordings (R2 API token)

Recordings upload straight from the teacher's browser to R2, which needs an R2 API token.

1. Dashboard → **R2 → Manage API tokens** → create a token with **Object Read & Write** on the
   `arruhayn-media` bucket only.
2. Set on the admin Worker: `R2_ACCOUNT_ID` (`94e09a58e9e025aa99f33049b3bd184a`),
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
3. CORS on the bucket is already set to allow uploads from the admin address. If the admin
   address changes, update it:

   ```bash
   npx wrangler r2 bucket cors set arruhayn-media --file docs/r2-cors.json
   ```

Without these secrets, uploads go through the Worker instead and are limited to 100 MB.

## 4. Turnstile (bot checks on public forms)

A Turnstile widget for the workers.dev hostnames has already been created and its keys set. If you
add a domain, add it to the widget under **Turnstile → arruhayn → Hostname management**.

## 5. Deploying

```bash
pnpm run deploy:all
```

builds once and deploys both Workers. To apply database changes:

```bash
CLOUDFLARE_ENV=admin pnpm run deploy:database
```

### Automatic deploys from GitHub (optional)

Dashboard → **Workers & Pages → arruhayn → Settings → Builds → Connect** to
`salimhatibu/arruhayn`, branch `main`:

- Build command: `pnpm exec opennextjs-cloudflare build`
- Deploy command: `npx wrangler deploy --env public`

Repeat for `arruhayn-admin` with `--env admin`.

## 6. Moving to your own domain (phase 15)

1. Add the domain to Cloudflare (or buy it through Cloudflare Registrar).
2. **arruhayn → Settings → Domains & Routes → Add custom domain**: `yourdomain.com`.
   **arruhayn-admin**: `admin.yourdomain.com`.
3. Zero Trust → Access → add a **self-hosted application** for `admin.yourdomain.com` with the same
   `arruhayn-staff` policy. Update `ACCESS_AUD`, then turn off the admin Worker's `workers.dev` route.
4. Update `PUBLIC_URL` and `ADMIN_URL` in `wrangler.jsonc`, the Turnstile hostnames, and
   `docs/r2-cors.json`. Redeploy.
5. Email: set up Cloudflare Email Service for the domain (SPF, DKIM, DMARC). Check that its terms
   allow newsletters; otherwise use Resend. Then switch on **Site settings → Send newsletter emails**.
   Pending subscribers get their confirmation email at that point. The email sending code is the
   remaining piece of phase 15.

## Everyday operations

- **Moon sighting:** if a month starts on a different day from Umm al-Qura, add it under
  **Calendar → Hijri month corrections**. The date strip, calendar, and feeds update immediately.
- **Rebuild search:** `CLOUDFLARE_ENV=admin NODE_ENV=production pnpm reindex`.
- **Backups:** D1 Time Travel restores any point in the last 30 days:
  `npx wrangler d1 time-travel restore arruhayn-db --timestamp=<ISO time>`.
  For an extra copy, `npx wrangler d1 export arruhayn-db --remote --output backup.sql`.
- **Logs:** Dashboard → Workers → (Worker) → Logs.
- **Scheduled jobs** run every 15 minutes on the admin Worker: they publish scheduled newsletter
  issues, delete questions 90 days after they're answered, and end classes left live by mistake.
