import type { Subscriber } from '@/payload-types'
import { sendConfirmation, sendingEnabled } from '@/lib/newsletter-send'
import { getPayloadClient } from '@/lib/payload'
import { errorJson, json } from '@/lib/staff'
import { verifyTurnstile } from '@/lib/turnstile'

const token = () => crypto.randomUUID().replace(/-/g, '')

// Saves a newsletter sign-up as pending and asks the person to confirm. While email sending is
// off the sign-up simply waits; the scheduled job asks them once it is switched on.
export async function POST(request: Request) {
  const body = (await request.json().catch((): null => null)) as {
    name?: string
    email?: string
    locale?: string
    token?: string
  } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (name.length > 120) return errorJson('Your name must be 120 characters or fewer.', 400, 'nameTooLong')
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254)
    return errorJson('Enter a valid email address.', 400, 'invalidEmail')
  if (!(await verifyTurnstile(body?.token, request.headers.get('cf-connecting-ip')))) {
    return errorJson('The bot check did not go through. Wait for it to finish, then try again.', 403, 'botCheck')
  }
  const payload = await getPayloadClient()
  const canSend = await sendingEnabled(payload)
  const language = body?.locale === 'ar' ? 'ar' : 'en'
  const existing = await payload.find({
    collection: 'subscribers',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })
  const current = existing.docs[0]
  // Whoever still needs to confirm gets asked below; a confirmed subscriber is left alone.
  let toConfirm: Subscriber | null = null
  if (!current) {
    toConfirm = await payload.create({
      collection: 'subscribers',
      overrideAccess: true,
      data: {
        ...(name ? { name } : {}),
        email,
        language,
        status: 'pending',
        confirmToken: token(),
        unsubscribeToken: token(),
      },
    })
  } else if (current.status === 'unsubscribed' || current.status === 'pending') {
    toConfirm = await payload.update({
      collection: 'subscribers',
      id: current.id,
      overrideAccess: true,
      data: {
        ...(name ? { name } : {}),
        status: 'pending',
        language,
        confirmToken: current.confirmToken || token(),
        unsubscribeToken: current.unsubscribeToken || token(),
        confirmSentAt: null,
      },
    })
  } else if (name && name !== current.name) {
    await payload.update({
      collection: 'subscribers',
      id: current.id,
      overrideAccess: true,
      data: { name },
    })
  }
  if (canSend && toConfirm) await sendConfirmation(payload, toConfirm)
  // The same answer whether or not the email was already on the list, so the form can't be used
  // to find out who subscribes.
  return json({ ok: true, pending: !canSend }, 200)
}
