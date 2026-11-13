// Sets (or resets) a staff member's password. Use it for the first admin, and whenever someone is
// locked out; there is no password-reset email until the site has its own domain.
//
//   pnpm set-password you@example.com                                            local dev database
//   CLOUDFLARE_ENV=admin NODE_ENV=production pnpm set-password you@example.com   production
//
// It asks for the password twice without showing it, so the password never appears in the command
// or in shell history. Scripts can pass it in STAFF_PASSWORD instead.
import config from '@payload-config'
import { getPayload } from 'payload'

const email = (process.argv.slice(2).find((a) => a.includes('@')) ?? '').toLowerCase()
if (!email) throw new Error('Give the staff member’s email: pnpm set-password you@example.com')

// Reads one line from the terminal without echoing it.
function ask(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin
    if (!stdin.isTTY) return reject(new Error('Run this in a terminal, or set STAFF_PASSWORD.'))
    process.stdout.write(question)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let value = ''
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off('data', onData)
          process.stdout.write('\n')
          return resolve(value)
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false)
          process.stdout.write('\n')
          process.exit(130)
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1)
        else value += ch
      }
    }
    stdin.on('data', onData)
  })
}

let password = process.env.STAFF_PASSWORD ?? ''
if (!password) {
  password = await ask('New password (at least 12 characters, not shown): ')
  const again = await ask('Type it again: ')
  if (password !== again) throw new Error('The two passwords did not match. Nothing was changed.')
}
if (password.length < 12) throw new Error('The password must be at least 12 characters. Nothing was changed.')

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
