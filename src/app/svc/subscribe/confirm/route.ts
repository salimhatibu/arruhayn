import { getPayloadClient } from '@/lib/payload'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const t = url.searchParams.get('t') ?? ''
  const payload = await getPayloadClient()
  const found = t
    ? await payload.find({ collection: 'subscribers', where: { confirmToken: { equals: t } }, limit: 1, overrideAccess: true })
    : null
  const sub = found?.docs[0]
  if (sub) {
    await payload.update({
      collection: 'subscribers',
      id: sub.id,
      overrideAccess: true,
      data: { status: 'confirmed', confirmedAt: new Date().toISOString(), confirmToken: null },
    })
  }
  const locale = sub?.language === 'ar' ? 'ar' : 'en'
  return Response.redirect(new URL(`/${locale}/newsletters?status=${sub ? 'confirmed' : 'invalid'}`, url), 303)
}
