import { hasRole } from '@/access/roles'
import { getPayloadClient } from '@/lib/payload'
import { errorJson, json, staffUser } from '@/lib/staff'

// The questions listeners have asked during a class, for its teacher's live room, and marking one
// answered (or set aside) from there.

async function classForTeacher(request: Request, id: string) {
  const user = await staffUser(request)
  if (!user) return { error: errorJson('Sign in to see this class.', 401) }
  const payload = await getPayloadClient()
  const cls = await payload.findByID({ collection: 'classes', id: Number(id), depth: 0, overrideAccess: true, disableErrors: true })
  if (!cls) return { error: errorJson('Class not found.', 404) }
  const teacherId = typeof cls.teacher === 'object' ? cls.teacher?.id : cls.teacher
  if (!hasRole(user, 'admin') && teacherId !== user.id) return { error: errorJson('Only this class\'s teacher can see its questions.', 403) }
  return { payload, cls }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const found = await classForTeacher(request, (await params).id)
  if ('error' in found) return found.error
  const { docs } = await found.payload.find({
    collection: 'questions',
    where: { class: { equals: found.cls.id } },
    sort: 'createdAt',
    limit: 500,
    depth: 0,
    overrideAccess: true,
    select: { question: true, askedBy: true, status: true, createdAt: true },
  })
  return json({ questions: docs.map((q) => ({ id: q.id, question: q.question, askedBy: q.askedBy, status: q.status, createdAt: q.createdAt })) })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const found = await classForTeacher(request, (await params).id)
  if ('error' in found) return found.error
  const body = (await request.json().catch((): null => null)) as { id?: number; status?: string } | null
  // "Answered" is answered live; "new" puts it back, for instance to leave it for the reviewers.
  if (!body?.id || (body.status !== 'answered' && body.status !== 'new')) return errorJson('Say which question and what to do with it.', 400)
  const q = await found.payload.findByID({ collection: 'questions', id: body.id, depth: 0, overrideAccess: true, disableErrors: true })
  const qClass = typeof q?.class === 'object' ? q?.class?.id : q?.class
  if (!q || qClass !== found.cls.id) return errorJson('That question is not from this class.', 404)
  await found.payload.update({ collection: 'questions', id: q.id, overrideAccess: true, data: { status: body.status } })
  return json({ ok: true })
}
