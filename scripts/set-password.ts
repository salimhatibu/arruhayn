// Sets (or resets) a staff member's password. Use it for the first admin, and whenever someone is
// locked out; there is no password-reset email until the site has its own domain.
//
//   read -rs STAFF_PASSWORD && export STAFF_PASSWORD
//   pnpm set-password you@example.com                                   local dev database
//   CLOUDFLARE_ENV=admin NODE_ENV=production pnpm set-password you@example.com   production
//
// The password is read from STAFF_PASSWORD so it never appears in the command or shell history.
import config from '@payload-config'
import { getPayload } from 'payload'

const email = (process.argv.slice(2).find((a) => a.includes('@')) ?? '').toLowerCase()
const password = process.env.STAFF_PASSWORD ?? ''

if (!email) throw new Error('Give the staff member’s email: pnpm set-password you@example.com')
if (password.length < 12) throw new Error('Set STAFF_PASSWORD to a password of at least 12 characters.')

const payload = await getPayload({ config })
const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
const user = found.docs[0]
if (!user) throw new Error(`No staff member with the email ${email}. Add them first (pnpm seed, or Settings → Staff).`)

await payload.update({
  collection: 'users',
  id: user.id,
  data: { password, loginAttempts: 0, lockUntil: null } as never,
  overrideAccess: true,
})
payload.logger.info(`Password set for ${email}`)
process.exit(0)
