import { hasRole } from '@/access/roles'
import { endClass } from '@/lib/classes'
import { getPayloadClient } from '@/lib/payload'
import { errorJson, json, staffUser } from '@/lib/staff'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await staffUser(request)
  if (!user) return errorJson('Sign in to end a class.', 401)
  const { id } = await params
  const payload = await getPayloadClient()
  const cls = await payload.findByID({ collection: 'classes', id: Number(id), depth: 0, overrideAccess: true, disableErrors: true })
  if (!cls) return errorJson('Class not found.', 404)
  const teacherId = typeof cls.teacher === 'object' ? cls.teacher?.id : cls.teacher
  if (!hasRole(user, 'admin') && teacherId !== user.id) return errorJson('Only this class\'s teacher can end it.', 403)
  const ended = await endClass(payload, cls)
  return json({ startedAt: ended.startedAt, endedAt: ended.endedAt, liveMinutes: ended.liveMinutes, attendance: ended.attendance })
}
