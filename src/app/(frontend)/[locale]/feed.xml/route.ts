import { isLocale, t } from '@/i18n/dictionary'
import { getPayloadClient } from '@/lib/payload'

// RSS feed of published recordings, for listeners who want to add it to a podcast app.
// It isn't submitted to any podcast directory.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) return new Response('Not found', { status: 404 })
  const d = t(locale)
  const base = process.env.PUBLIC_URL ?? new URL(request.url).origin
  const payload = await getPayloadClient()
  const recordings = await payload.find({
    collection: 'recordings',
    locale,
    where: { and: [{ status: { equals: 'published' } }, { inFeed: { equals: true } }] },
    sort: '-publishedAt',
    limit: 200,
    depth: 1,
  })
  const items = recordings.docs
    .map((r) => {
      const url = `${base}/media/${r.fileKey.split('/').map(encodeURIComponent).join('/')}`
      const teacher = typeof r.teacher === 'object' && r.teacher ? r.teacher.name : ''
      return `<item>
  <title>${esc(r.title)}</title>
  <link>${base}/${locale}/library/${r.id}</link>
  <guid isPermaLink="false">arruhayn-recording-${r.id}</guid>
  <pubDate>${new Date(r.publishedAt ?? r.createdAt).toUTCString()}</pubDate>
  <description>${esc(r.description ?? '')}</description>
  <enclosure url="${esc(url)}" length="${r.sizeBytes ?? 0}" type="${esc(r.mimeType ?? 'audio/mpeg')}"/>
  ${teacher ? `<itunes:author>${esc(teacher)}</itunes:author>` : ''}
  ${r.durationSeconds ? `<itunes:duration>${r.durationSeconds}</itunes:duration>` : ''}
</item>`
    })
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(`${d.siteName} · ${d.library.title}`)}</title>
  <link>${base}/${locale}/library</link>
  <atom:link href="${base}/${locale}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>${esc(d.library.intro)}</description>
  <language>${locale}</language>
  <itunes:image href="${base}/brand/icon-512.png"/>
  <itunes:explicit>false</itunes:explicit>
${items}
</channel>
</rss>`
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=900' } })
}
