import type { User } from '@/payload-types'

import { getPayloadClient } from './payload'

// The signed-in staff member for a route handler on the admin Worker, or null.
export async function staffUser(request: Request): Promise<User | null> {
  if (process.env.SITE_MODE === 'public') return null
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: request.headers })
  return (user as User | null) ?? null
}

export const json = (data: unknown, status = 200) => Response.json(data, { status })
// `code` names the error for public pages, which show it in the visitor's language (see `errors` in
// the dictionary); `error` is the English wording, for staff pages and anything else reading it.
export const errorJson = (error: string, status: number, code?: string) => Response.json({ error, ...(code ? { code } : {}) }, { status })

// RealtimeKit lives on Cloudflare's API, which a slow or dropped connection can fail to reach. Its
// failures are answered with a plain message rather than left to crash the route with an empty 500.
export const SERVICE_UNREACHABLE = 'The live-class service could not be reached. Check the connection and try again.'
