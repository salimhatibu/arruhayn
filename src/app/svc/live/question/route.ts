import { getPayloadClient } from '@/lib/payload'
import { errorJson, json } from '@/lib/staff'

// A listener's question to the teacher during a live class. It goes into Questions, linked to the
// class: the teacher sees it in the live room, and one left unanswered stays for the reviewers.
//
// Only someone who joined this class can ask, which means they passed the bot check to join; that
// stands in for a second check here. One person can ask once every 15 seconds and 10 times a class.
const MIN_GAP_MS = 15_000
const MAX_PER_CLASS = 10

export async function POST(request: Request) {
  const body = (await request.json().catch((): null => null)) as {
    classId?: number
    visitor?: string
    name?: string
    question?: string
    locale?: string
  } | null
  const question = body?.question?.trim().replace(/\s+\n/g, '\n') ?? ''
  const name = body?.name?.trim().replace(/\s+/g, ' ').slice(0, 60) ?? ''
  const visitor = typeof body?.visitor === 'string' && /^[\w-]{8,64}$/.test(body.visitor) ? body.visitor : ''
  if (question.length < 5 || question.length > 1000) return errorJson('Write your question in 5 to 1,000 characters.', 400, 'questionShort')
  if (!visitor) return errorJson('Join the class to ask a question.', 403, 'notJoined')

  const payload = await getPayloadClient()
  const classId = Number(body?.classId)
  const cls = await payload.findByID({ collection: 'classes', id: classId, depth: 0, overrideAccess: true, disableErrors: true, select: { status: true } })
  if (!cls || cls.status !== 'live') return errorJson('This class is not live right now.', 409, 'notLive')

  const joined = await payload.count({
    collection: 'class-joins',
    where: { and: [{ class: { equals: classId } }, { visitor: { equals: visitor } }] },
    overrideAccess: true,
  })
  if (!joined.totalDocs) return errorJson('Join the class to ask a question.', 403, 'notJoined')

  const mine = await payload.find({
    collection: 'questions',
    where: { and: [{ class: { equals: classId } }, { visitor: { equals: visitor } }] },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (mine.totalDocs >= MAX_PER_CLASS) return errorJson('You have asked as many questions as one class allows.', 429, 'tooMany')
  const last = mine.docs[0]
  if (last && Date.now() - new Date(last.createdAt).getTime() < MIN_GAP_MS) {
    return errorJson('Wait a moment before sending another question.', 429, 'tooFast')
  }

  await payload.create({
    collection: 'questions',
    overrideAccess: true,
    data: { question, language: body?.locale === 'ar' ? 'ar' : 'en', class: classId, askedBy: name || null, visitor, status: 'new' },
  })
  return json({ ok: true })
}
