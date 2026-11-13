import { getPayloadClient } from '@/lib/payload'
import { errorJson, json } from '@/lib/staff'
import { verifyTurnstile } from '@/lib/turnstile'

const token = () => crypto.randomUUID().replace(/-/g, '')

// Saves a newsletter sign-up as pending. A confirmation email goes out once email sending is on
// (see the scheduled jobs in worker.ts); until then sign-ups wait as pending.
export async function POST(request: Request) {
  const body = (await request.json().catch((): null => null)) as { email?: string; locale?: string; token?: string } | null
  const email = body?.email?.trim().toLowerCase() ?? ''
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return errorJson('Enter a valid email address.', 400)
  if (!(await verifyTurnstile(body?.token, request.headers.get('cf-connecting-ip')))) {
    return errorJson('The bot check failed. Reload the page and try again.', 403)
  }
  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const language = body?.locale === 'ar' ? 'ar' : 'en'
  const existing = await payload.find({
    collection: 'subscribers',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })
  const current = existing.docs[0]
  if (!current) {
    await payload.create({
      collection: 'subscribers',
      overrideAccess: true,
      data: { email, language, status: 'pending', confirmToken: token(), unsubscribeToken: token() },
    })
  } else if (current.status === 'unsubscribed') {
    await payload.update({
      collection: 'subscribers',
      id: current.id,
      overrideAccess: true,
      data: { status: 'pending', language, confirmToken: token() },
    })
  }
  // The same answer whether or not the email was already on the list, so the form can't be used
  // to find out who subscribes.
  return json({ ok: true, pending: !settings.emailSending }, 200)
}
