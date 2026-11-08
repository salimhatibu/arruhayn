import { buildFeed, FEEDS, type Feed } from '@/lib/calendar'
import { getMonthOverrides } from '@/lib/payload'

// Subscribable calendar feeds: /calendar/classes.ics, /calendar/islamic-dates.ics, and
// /calendar/sunnah-fasts.ics. Add ?lang=ar for Arabic titles. Each covers the next 12 months
// from the day it's fetched.
export async function GET(request: Request, { params }: { params: Promise<{ feed: string }> }) {
  const { feed: file } = await params
  const feed = file.replace(/\.ics$/, '') as Feed
  if (!file.endsWith('.ics') || !FEEDS.includes(feed)) return new Response('Not found', { status: 404 })
  const url = new URL(request.url)
  const locale = url.searchParams.get('lang') === 'ar' ? 'ar' : 'en'
  const base = process.env.PUBLIC_URL ?? url.origin
  const body = await buildFeed(feed, locale, base, await getMonthOverrides())
  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `inline; filename="${feed}.ics"`,
      'cache-control': 'public, max-age=3600',
    },
  })
}
