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
export const errorJson = (error: string, status: number) => Response.json({ error }, { status })
