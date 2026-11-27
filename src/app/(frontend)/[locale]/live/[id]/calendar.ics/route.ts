import { isLocale } from '@/i18n/dictionary'
import { speakerName } from '@/lib/format'
import { buildCalendar } from '@/lib/ics'
import { getPayloadClient } from '@/lib/payload'

// One class as a calendar file, for Apple Calendar, Outlook and the rest. Calendar apps show it in
// the device's own time zone and remind half an hour before.
export async function GET(request: Request, { params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  if (!isLocale(locale) || !Number.isInteger(Number(id))) return new Response('Not found', { status: 404 })
  const payload = await getPayloadClient()
  const cls = await payload.findByID({ collection: 'classes', id: Number(id), locale, depth: 1, disableErrors: true })
  if (!cls || cls.status === 'cancelled') return new Response('Not found', { status: 404 })
  const base = process.env.PUBLIC_URL ?? new URL(request.url).origin
  const url = `${base}/${locale}/live/${cls.id}`
  const speaker = speakerName(cls)
  const ics = buildCalendar(cls.title, [
    {
      uid: `arruhayn-class-${cls.id}`,
      title: cls.title,
      description: [speaker, cls.description, url].filter(Boolean).join('\n\n'),
      url,
      start: cls.startsAt,
      end: new Date(new Date(cls.startsAt).getTime() + (cls.durationMinutes ?? 90) * 60_000).toISOString(),
      alarmMinutesBefore: 30,
    },
  ])
  return new Response(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="arruhayn-class-${cls.id}.ics"`,
      'cache-control': 'no-store',
    },
  })
}
