import Link from 'next/link'
import type { Where } from 'payload'

import { t, type Locale } from '@/i18n/dictionary'
import { formatDate } from '@/lib/format'
import { getPayloadClient, getTopics } from '@/lib/payload'

import { ListeningRoom, type RoomRecording } from './ListeningRoom'

// The library page, shared by /library and /library/[id] so a link to one recording opens the room
// with that recording chosen.
export async function LibraryRoom({ locale, selectedId, topic: topicSlug }: { locale: Locale; selectedId?: number; topic?: string }) {
  const d = t(locale)
  const L = d.library
  const payload = await getPayloadClient()
  const topics = await getTopics(locale)
  const topic = topics.find((x) => x.slug === topicSlug)
  const where: Where = { status: { equals: 'published' } }
  if (topic) where.topics = { contains: topic.id }
  const [found, all] = await Promise.all([
    payload.find({ collection: 'recordings', locale, where, sort: '-publishedAt', limit: 200, depth: 1 }),
    payload.find({ collection: 'recordings', where: { status: { equals: 'published' } }, pagination: false, depth: 0, select: { topics: true } }),
  ])
  const used = new Set(all.docs.flatMap((r) => (r.topics ?? []).map((tp) => (typeof tp === 'object' ? tp.id : tp))))

  const recordings: RoomRecording[] = found.docs.map((r) => ({
    id: r.id,
    title: r.title,
    teacher: typeof r.teacher === 'object' && r.teacher ? r.teacher.name : undefined,
    date: formatDate(r.publishedAt, locale),
    duration: r.durationSeconds,
    src: `/media/${r.fileKey.split('/').map(encodeURIComponent).join('/')}`,
    description: r.description,
    topics: (r.topics ?? []).flatMap((tp) => (typeof tp === 'object' ? [{ slug: tp.slug, name: tp.name }] : [])),
  }))
  // A recording opened by link is shown even when the topic filter would hide it.
  if (selectedId && !recordings.some((r) => r.id === selectedId)) {
    const extra = await payload.find({
      collection: 'recordings',
      locale,
      where: { and: [{ id: { equals: selectedId } }, { status: { equals: 'published' } }] },
      limit: 1,
      depth: 1,
    })
    const r = extra.docs[0]
    if (r)
      recordings.unshift({
        id: r.id,
        title: r.title,
        teacher: typeof r.teacher === 'object' && r.teacher ? r.teacher.name : undefined,
        date: formatDate(r.publishedAt, locale),
        duration: r.durationSeconds,
        src: `/media/${r.fileKey.split('/').map(encodeURIComponent).join('/')}`,
        description: r.description,
        topics: (r.topics ?? []).flatMap((tp) => (typeof tp === 'object' ? [{ slug: tp.slug, name: tp.name }] : [])),
      })
  }

  return (
    <div className="wrap library">
      <header className="library-head">
        <svg className="sparkle head-sparkle" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 1v18M1 10h18M4 4l12 12M16 4 4 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <p className="section-kicker">
          {L.kicker} · <span lang={locale === 'ar' ? 'en' : 'ar'}>{locale === 'ar' ? 'The library' : 'المكتبة'}</span>
        </p>
        <h1>
          {L.headline[0]} <em>{L.headline[1]}</em>
        </h1>
        <p className="section-deck">{L.intro}</p>
        {used.size ? (
          <nav className="library-topics" aria-label={d.topics}>
            <Link className="chip-paper" href={`/${locale}/library`} aria-current={!topic}>
              {L.allTopics}
            </Link>
            {topics
              .filter((tp) => used.has(tp.id))
              .map((tp) => (
                <Link key={tp.id} className="chip-paper" href={`/${locale}/library?topic=${tp.slug}`} aria-current={tp.id === topic?.id}>
                  {tp.name}
                </Link>
              ))}
          </nav>
        ) : null}
      </header>
      {recordings.length ? (
        <ListeningRoom recordings={recordings} initialId={selectedId} locale={locale} rssHref={`/${locale}/feed.xml`} />
      ) : (
        <p className="story-deck" style={{ textAlign: 'center' }}>
          {L.none}
        </p>
      )}
    </div>
  )
}
