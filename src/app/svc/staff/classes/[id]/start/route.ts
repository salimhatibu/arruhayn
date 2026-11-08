import { hasRole } from '@/access/roles'
import { getPayloadClient } from '@/lib/payload'
import { addParticipant, createMeeting, realtimeConfigured } from '@/lib/realtimekit'
import { errorJson, json, staffUser } from '@/lib/staff'

// Starts (or rejoins) a class: creates its RealtimeKit meeting if needed, marks it live, and
// returns a host token for the teacher.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await staffUser(request)
  if (!user) return errorJson('Sign in to start a class.', 401)
  if (!realtimeConfigured()) return errorJson('Live classes are not set up yet.', 503)
  const { id } = await params
  const payload = await getPayloadClient()
  const cls = await payload.findByID({ collection: 'classes', id: Number(id), depth: 0, overrideAccess: true, disableErrors: true })
  if (!cls) return errorJson('Class not found.', 404)
  const teacherId = typeof cls.teacher === 'object' ? cls.teacher?.id : cls.teacher
  if (!hasRole(user, 'admin') && teacherId !== user.id) return errorJson('Only this class\'s teacher can start it.', 403)

  const meetingId = cls.meetingId || (await createMeeting(cls.title))
  await payload.update({ collection: 'classes', id: cls.id, overrideAccess: true, data: { meetingId, status: 'live' } })
  const authToken = await addParticipant(meetingId, user.name, 'host', `staff-${user.id}`)
  return json({ authToken })
}
