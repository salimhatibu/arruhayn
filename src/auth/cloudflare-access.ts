import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { AuthStrategy } from 'payload'

// Optional sign-in through Cloudflare Access, for when Access sits in front of the admin domain.
// Access adds a signed token to every request; this strategy verifies it and finds the matching
// staff user by email. Without ACCESS_TEAM_DOMAIN and ACCESS_AUD it does nothing, and staff use
// their email and password instead.

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

    // Local development can skip the login form by signing in as DEV_STAFF_EMAIL. Leave it empty in
    // .env to use the login form locally.
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
