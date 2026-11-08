import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { AuthStrategy } from 'payload'

// Staff sign in through Cloudflare Access in front of the admin Worker. Access adds a signed token
// to every request; this strategy verifies it and finds the matching staff user by email.
// There is no password login.

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined

async function emailFromAccessToken(token: string): Promise<string | null> {
  const teamDomain = process.env.ACCESS_TEAM_DOMAIN
  const audience = process.env.ACCESS_AUD
  if (!teamDomain || !audience) return null
  const issuer = `https://${teamDomain.replace(/^https?:\/\//, '')}`
  jwks ??= createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`))
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience })
    return typeof payload.email === 'string' ? payload.email.toLowerCase() : null
  } catch {
    return null
  }
}

export const cloudflareAccess: AuthStrategy = {
  name: 'cloudflare-access',
  authenticate: async ({ headers, payload }) => {
    // Only the admin Worker trusts staff identity. The public Worker never signs anyone in.
    if (process.env.SITE_MODE === 'public') return { user: null }

    const token = headers.get('cf-access-jwt-assertion')
    let email = token ? await emailFromAccessToken(token) : null

    // Local development has no Access in front of it, so it signs in as DEV_STAFF_EMAIL.
    if (!email && process.env.NODE_ENV === 'development' && process.env.DEV_STAFF_EMAIL) {
      email = process.env.DEV_STAFF_EMAIL.toLowerCase()
    }
    if (!email) return { user: null }

    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const user = found.docs[0]
    return { user: user ? { ...user, collection: 'users', _strategy: 'cloudflare-access' } : null }
  },
}
