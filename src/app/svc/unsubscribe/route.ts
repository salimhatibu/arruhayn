import { getPayloadClient } from '@/lib/payload'

async function unsubscribe(request: Request) {
  const url = new URL(request.url)
  const t = url.searchParams.get('t') ?? ''
  const payload = await getPayloadClient()
  const found = t
    ? await payload.find({ collection: 'subscribers', where: { unsubscribeToken: { equals: t } }, limit: 1, overrideAccess: true })
    : null
  const sub = found?.docs[0]
  if (sub) {
    await payload.update({ collection: 'subscribers', id: sub.id, overrideAccess: true, data: { status: 'unsubscribed' } })
  }
  return sub
}

// Link in each email.
export async function GET(request: Request) {
  const sub = await unsubscribe(request)
  const locale = sub?.language === 'ar' ? 'ar' : 'en'
  return Response.redirect(new URL(`/${locale}/newsletters?status=unsubscribed`, request.url), 303)
}

// One-click unsubscribe from mail apps (List-Unsubscribe-Post).
export async function POST(request: Request) {
  await unsubscribe(request)
  return new Response(null, { status: 204 })
}
