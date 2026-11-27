import { isLocale } from '@/i18n/dictionary'
import { getLiveClass } from '@/lib/payload'

// The class that is live right now, if any, for the "Live now" banner to check against.
export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get('locale') ?? 'en'
  const live = isLocale(locale) ? await getLiveClass(locale) : null
  return Response.json(live ? { id: live.id, title: live.title } : null, { headers: { 'cache-control': 'no-store' } })
}
