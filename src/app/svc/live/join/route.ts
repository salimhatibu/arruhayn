import { recordJoin } from '@/lib/classes'
import { getPayloadClient } from '@/lib/payload'
import { addParticipant, realtimeConfigured } from '@/lib/realtimekit'
import { errorJson, json, SERVICE_UNREACHABLE } from '@/lib/staff'
import { verifyTurnstile } from '@/lib/turnstile'

// A student joins a live class as a listener. No account is needed, only a display name.
export async function POST(request: Request) {
  const body = (await request.json().catch((): null => null)) as { classId?: number; name?: string; token?: string; visitor?: string } | null
  const name = body?.name?.trim().replace(/\s+/g, ' ').slice(0, 60) ?? ''
  if (!name) return errorJson('Enter your name to join.', 400)
  if (!realtimeConfigured()) return errorJson('Live classes are not set up yet.', 503, 'notConfigured')
  if (!(await verifyTurnstile(body?.token, request.headers.get('cf-connecting-ip')))) {
    return errorJson('The bot check did not go through. Wait for it to finish, then try again.', 403, 'botCheck')
  }
  const payload = await getPayloadClient()
  const cls = await payload.findByID({
    collection: 'classes',
    id: Number(body?.classId),
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!cls || cls.status !== 'live' || !cls.meetingId) return errorJson('This class is not live right now.', 409, 'notLive')
  let authToken: string
  try {
    authToken = await addParticipant(cls.meetingId, name, 'viewer', `guest-${crypto.randomUUID()}`)
  } catch (err) {
    payload.logger.error(err)
    return errorJson(SERVICE_UNREACHABLE, 502, 'unreachable')
  }
  // The browser keeps a random id so attendance counts it once, however often it reconnects.
  const visitor = typeof body?.visitor === 'string' && /^[\w-]{8,64}$/.test(body.visitor) ? body.visitor : crypto.randomUUID()
  await recordJoin(payload, cls.id, visitor)
  return json({ authToken })
}
