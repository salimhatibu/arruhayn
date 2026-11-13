import { getPayloadClient } from '@/lib/payload'
import { errorJson, json } from '@/lib/staff'

// Scheduled maintenance, run every 15 minutes by the admin Worker's cron trigger (see worker.ts).
// It runs through Payload so the usual hooks (search indexing) apply.
export async function POST(request: Request) {
  const secret = process.env.JOBS_SECRET
  if (!secret || request.headers.get('x-jobs-secret') !== secret) return errorJson('Not found', 404)

  const payload = await getPayloadClient()
  const now = new Date()
  const done: Record<string, number> = {}

  // Publish scheduled newsletter issues whose time has come.
  const due = await payload.find({
    collection: 'newsletters',
    where: { and: [{ status: { equals: 'scheduled' } }, { publishAt: { less_than_equal: now.toISOString() } }] },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  for (const issue of due.docs) {
    await payload.update({ collection: 'newsletters', id: issue.id, data: { status: 'published' }, overrideAccess: true })
  }
  done.newslettersPublished = due.docs.length

  // Delete questions 90 days after they were answered or declined.
  const cutoff = new Date(now.getTime() - 90 * 86_400_000).toISOString()
  const old = await payload.delete({
    collection: 'questions',
    where: { and: [{ status: { in: ['answered', 'declined'] } }, { answeredAt: { less_than: cutoff } }] },
    overrideAccess: true,
  })
  done.questionsDeleted = old.docs.length

  // A class left "live" long after it should have finished is marked ended, so the site stops
  // showing the live banner.
  const live = await payload.find({ collection: 'classes', where: { status: { equals: 'live' } }, limit: 20, depth: 0, overrideAccess: true })
  let ended = 0
  for (const c of live.docs) {
    const finish = new Date(c.startsAt).getTime() + ((c.durationMinutes ?? 90) + 180) * 60_000
    if (finish < now.getTime()) {
      await payload.update({ collection: 'classes', id: c.id, data: { status: 'ended' }, overrideAccess: true })
      ended++
    }
  }
  done.classesEnded = ended

  return json({ ok: true, ...done })
}
