import { hasRole } from '@/access/roles'
import { getPayloadClient } from '@/lib/payload'
import { errorJson, json, staffUser } from '@/lib/staff'

// Lets the teacher allow or stop listeners recording during a class. Listeners pick the change up
// the next time their room checks the class's status.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await staffUser(request)
  if (!user) return errorJson('Sign in to change this class.', 401)
  const body = (await request.json().catch((): null => null)) as { allowRecording?: unknown } | null
  if (typeof body?.allowRecording !== 'boolean') return errorJson('Say whether recording is allowed.', 400)
  const { id } = await params
  const payload = await getPayloadClient()
  const cls = await payload.findByID({ collection: 'classes', id: Number(id), depth: 0, overrideAccess: true, disableErrors: true })
  if (!cls) return errorJson('Class not found.', 404)
  const teacherId = typeof cls.teacher === 'object' ? cls.teacher?.id : cls.teacher
  if (!hasRole(user, 'admin') && teacherId !== user.id) return errorJson('Only this class\'s teacher can change this.', 403)
  await payload.update({ collection: 'classes', id: cls.id, overrideAccess: true, data: { allowRecording: body.allowRecording } })
  return json({ allowRecording: body.allowRecording })
}
