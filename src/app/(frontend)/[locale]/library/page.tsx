import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { Pager } from '@/components/site/Pager'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatDuration } from '@/lib/format'
import { getPayloadClient, getTopics } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ teacher?: string; topic?: string; page?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: t(locale).library.title,
    alternates: { types: { 'application/rss+xml': `/${locale}/feed.xml` } },
  }
}

export default async function LibraryPage({ params, searchParams }: Props) {
  const { locale } = await params
  const sp = await searchParams
  const d = t(locale)
  const page = Math.max(1, Number(sp.page) || 1)
  const payload = await getPayloadClient()
  const topics = await getTopics(locale)
  const topic = topics.find((x) => x.slug === sp.topic)
  const where: Where = { status: { equals: 'published' } }
  if (sp.teacher) where.teacher = { equals: Number(sp.teacher) }
  if (topic) where.topics = { contains: topic.id }
  const recordings = await payload.find({ collection: 'recordings', locale, where, sort: '-publishedAt', page, limit: 20, depth: 1 })
  const teachers = new Map<number, string>()
  const all = await payload.find({ collection: 'recordings', where: { status: { equals: 'published' } }, depth: 1, limit: 500, pagination: false, select: { teacher: true } })
  for (const r of all.docs) if (typeof r.teacher === 'object' && r.teacher) teachers.set(r.teacher.id, r.teacher.name)

  const qs = (p: number) => {
    const q = new URLSearchParams()
    if (sp.teacher) q.set('teacher', sp.teacher)
    if (sp.topic) q.set('topic', sp.topic)
    if (p > 1) q.set('page', String(p))
    const s = q.toString()
    return `/${locale}/library${s ? `?${s}` : ''}`
  }

  return (
    <div className="wrap">
      <h1>{d.library.title}</h1>
      <p className="muted reading">
        {d.library.intro} <a href={`/${locale}/feed.xml`}>{d.library.rss}</a>
      </p>
      <div className="layout-side" style={{ marginTop: '1.5rem' }}>
        <div>
          {recordings.docs.length ? (
            <ul className="list">
              {recordings.docs.map((r) => (
                <li key={r.id}>
                  <Link className="title" href={`/${locale}/library/${r.id}`}>
                    {r.title}
                  </Link>
                  <div className="meta">
                    {typeof r.teacher === 'object' && r.teacher ? <span>{r.teacher.name}</span> : null}
                    <span>{formatDate(r.publishedAt, locale)}</span>
                    {r.durationSeconds ? <span>{formatDuration(r.durationSeconds)}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{d.library.none}</p>
          )}
          <Pager locale={locale} page={recordings.page ?? 1} totalPages={recordings.totalPages} makeHref={qs} />
        </div>
        <aside className="filters">
          {teachers.size ? (
            <>
              <h2 style={{ fontSize: '1.15rem', marginTop: 0 }}>{d.scholar}</h2>
              <Link href={`/${locale}/library`} aria-current={!sp.teacher}>
                {d.library.allTeachers}
              </Link>
              {[...teachers].map(([id, name]) => (
                <Link key={id} href={`/${locale}/library?teacher=${id}`} aria-current={sp.teacher === String(id)}>
                  {name}
                </Link>
              ))}
            </>
          ) : null}
          <h2 style={{ fontSize: '1.15rem' }}>{d.topics}</h2>
          {topics.map((tp) => (
            <Link key={tp.id} href={`/${locale}/library?topic=${tp.slug}`} aria-current={tp.slug === sp.topic}>
              {tp.name}
            </Link>
          ))}
        </aside>
      </div>
    </div>
  )
}
