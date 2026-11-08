import { getPayloadClient } from '@/lib/payload'
import { errorJson, json } from '@/lib/staff'
import { verifyTurnstile } from '@/lib/turnstile'

// Public "ask a question" form. Questions are stored privately for reviewers.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    question?: string
    language?: string
    email?: string
    token?: string
  } | null
  const question = body?.question?.trim() ?? ''
  if (question.length < 20 || question.length > 4000) return errorJson('Write your question in 20 to 4,000 characters.', 400)
  if (!(await verifyTurnstile(body?.token, request.headers.get('cf-connecting-ip')))) {
    return errorJson('The bot check failed. Reload the page and try again.', 403)
  }
  const email = body?.email?.trim().toLowerCase()
  const payload = await getPayloadClient()
  await payload.create({
    collection: 'questions',
    overrideAccess: true,
    data: {
      question,
      language: body?.language === 'ar' ? 'ar' : 'en',
      email: email && /^\S+@\S+\.\S+$/.test(email) ? email : undefined,
      status: 'new',
    },
  })
  return json({ ok: true }, 201)
}
