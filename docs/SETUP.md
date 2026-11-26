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

## 1. Staff sign-in

Staff sign in at https://arruhayn-admin.salimhatibu786.workers.dev/admin with an email and password.
After five wrong attempts an account locks for 15 minutes. Cloudflare Access is optional for now;
add it once the site has its own domain (see section 7).

1. Apply the database change that adds passwords (once):

   ```bash
   CLOUDFLARE_ENV=admin pnpm run deploy:database
   ```

2. Give the first admin a password. The command asks for it twice without showing it (at least 12
   characters), so it never ends up in your shell history:

   ```bash
   CLOUDFLARE_ENV=admin NODE_ENV=production pnpm set-password you@example.com
   ```

   If the admin account doesn't exist yet, create it first with
   `CLOUDFLARE_ENV=admin NODE_ENV=production pnpm seed you@example.com "Your Name"`.

3. Add other staff from the admin under **Settings → Staff**, then set their password the same way
   (or open their record and use **Change password**). Password-reset emails start working once
   email sending is set up with the domain; until then, reset passwords with `pnpm set-password`.

## 2. Live classes (RealtimeKit)

Live classes stay switched off until all three secrets below are set: the join endpoints answer
`Live classes are not set up yet.` until then.

### 2.1 Create the app

Open [Realtime → RealtimeKit](https://dash.cloudflare.com/?to=/:account/realtime/kit) and click
**Create App**. Creating it in the dashboard also sets up the default presets, which is why the
dashboard is the way to do it rather than the API.

The app's identifier is the long id Cloudflare shows for it (it is the `<app_id>` in the API URLs).
That is `RTK_APP_ID`.

### 2.2 Create an API token

**My Profile → API Tokens → Create Token → Create Custom Token**, and give it **Realtime** (or
**Realtime Admin**) permissions on this account. Copy the token once — Cloudflare does not show it
again. That is `RTK_API_TOKEN`.

### 2.3 Put the values in .env

```
RTK_ACCOUNT_ID=94e09a58e9e025aa99f33049b3bd184a
RTK_APP_ID=the app's identifier
RTK_API_TOKEN=the API token
```

`.env` is never committed. The rest of this section is two commands that read from it.

### 2.4 Check that it works

```bash
pnpm rtk:check
```

This lists the app's presets, then creates a throwaway meeting and joins it as both a teacher and
a listener — the same calls a real class makes. It tells you what is wrong if anything is.

The one thing that often needs attention: the site asks for presets by name, `webinar_presenter`
for the teacher and `webinar_viewer` for everyone listening. Cloudflare does not document what its
default presets are called, so if the check reports them missing, either rename the presets in the
RealtimeKit dashboard, or set `RTK_HOST_PRESET` and `RTK_VIEWER_PRESET` — in `.env` here, and in
`wrangler.jsonc` under both environments' `vars`. The host preset needs permission to present,
share a screen, and admit raised hands; the viewer preset needs to listen and ask to speak.

### 2.5 Put them on the Workers

```bash
pnpm rtk:secrets
```

This sets all three on **both** Workers — the teacher's room is on the admin Worker and students
join through the public one, so both need them. It asks for confirmation first, and pipes each
value to `wrangler`, so nothing ends up in your shell history. Secrets take effect without a
redeploy.

To do it by hand instead: `npx wrangler secret put RTK_ACCOUNT_ID --env admin`, then again with
`--env public`, and the same for the other two.

### 2.6 Try a real class

Make a class under **Classes** with a start time in the next few minutes, open it, and use
**Open the live room**. Then open the class on the public site in another browser and join. If the
room refuses, the admin Worker's logs carry Cloudflare's own error.

Use desktop Chrome or Edge for screen sharing and recording. Run a full-length test class before
the first real one.

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

Without these secrets, uploads use multipart requests through the Worker. This supports recordings
up to the application's 2 GB upload limit, but browser-to-R2 uploads with the token are more
efficient for large files.

## 4. Email (Resend)

Confirmation emails, newsletter issues, and staff password resets all go out through
[Resend](https://resend.com). Cloudflare's own Email Service is for transactional mail only, so it
may not carry a newsletter.

Nothing is sent until **both** the API key is set and **Site settings → Send newsletter emails** is
switched on. Until then sign-ups wait as pending, and the scheduled job asks them to confirm as
soon as you switch it on.

1. Create a Resend account and verify the domain you send from (Resend walks you through the SPF,
   DKIM, and DMARC records). This needs your own domain — see section 7.
2. Create an API key with **Sending access**.
3. Set on **both** Workers:

   | Secret | Value |
   | --- | --- |
   | `RESEND_API_KEY` | the API key |

4. Set the from address in `wrangler.jsonc` under both environments' `vars`, using a mailbox on
   the verified domain:

   ```jsonc
   "EMAIL_FROM": "Arruhayn <salam@yourdomain.com>",
   ```

   `EMAIL_REPLY_TO` is optional, for replies going somewhere else.
5. Deploy, then switch on **Site settings → Send newsletter emails**.

**Before you switch it on,** check **Publishing → Newsletters**: any issue that is published and has
an empty **Emailed at** will go out at the next quarter hour. Issues published before email existed
were stamped as already sent by the database change, so only new ones go out.

What goes out, and when:

| Email | When |
| --- | --- |
| Confirm your subscription | As soon as someone signs up. People who signed up earlier are caught up by the scheduled job. |
| A newsletter issue | Within 15 minutes of the issue being published, to confirmed subscribers, in the language each chose. **Emailed at** then records that it went. |
| Staff password reset | When a staff member asks for one from the sign-in screen. |

Every newsletter carries an unsubscribe link and the `List-Unsubscribe` headers mail apps use for
their own unsubscribe button. To send an issue again, clear its **Emailed at** and wait a quarter
hour.

## 5. Turnstile (bot checks on public forms)

A Turnstile widget for the workers.dev hostnames has already been created and its keys set. If you
add a domain, add it to the widget under **Turnstile → arruhayn → Hostname management**.

## 6. Deploying

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

## 7. Moving to your own domain

1. Add the domain to Cloudflare (or buy it through Cloudflare Registrar).
2. **arruhayn → Settings → Domains & Routes → Add custom domain**: `yourdomain.com`.
   **arruhayn-admin**: `admin.yourdomain.com`.
3. Optional, for a second layer in front of the password: Zero Trust → Access → add a
   **self-hosted application** for `admin.yourdomain.com` with an `arruhayn-staff` group of staff
   emails. Set `ACCESS_TEAM_DOMAIN` (`<team>.cloudflareaccess.com`) and `ACCESS_AUD` (the
   application's AUD tag) as secrets on the admin Worker; staff are then signed in automatically
   by Access. Turn off the admin Worker's `workers.dev` route.
4. Update `PUBLIC_URL` and `ADMIN_URL` in `wrangler.jsonc`, the Turnstile hostnames, and
   `docs/r2-cors.json`. Redeploy.
5. Verify the domain with Resend and set `RESEND_API_KEY` and `EMAIL_FROM` (section 4), then switch
   on **Site settings → Send newsletter emails**. Everyone waiting as pending is asked to confirm
   at that point.

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
