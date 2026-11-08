import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { FatwaList } from '@/components/site/FatwaList'
import { Pager } from '@/components/site/Pager'
import { t, type Locale } from '@/i18n/dictionary'
import { getPayloadClient, getTopics } from '@/lib/payload'

type Props = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ topic?: string; scholar?: string; page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).nav.fatwas }
}

export default async function FatwasPage({ params, searchParams }: Props) {
  const { locale } = await params
  const sp = await searchParams
  const d = t(locale)
  const page = Math.max(1, Number(sp.page) || 1)
  const payload = await getPayloadClient()
  const topics = await getTopics(locale)
  const scholars = await payload.find({ collection: 'scholars', locale, limit: 100, depth: 0, sort: 'name' })

  const topic = topics.find((x) => x.slug === sp.topic)
  const where: Where = { status: { equals: 'published' } }
  if (topic) where.topics = { contains: topic.id }
  if (sp.scholar) where.scholar = { equals: Number(sp.scholar) }

  const result = await payload.find({ collection: 'fatwas', locale, where, sort: '-number', limit: 20, page, depth: 1 })
  const query = (p: number) => {
    const q = new URLSearchParams()
    if (sp.topic) q.set('topic', sp.topic)
    if (sp.scholar) q.set('scholar', sp.scholar)
    if (p > 1) q.set('page', String(p))
    const s = q.toString()
    return `/${locale}/fatwas${s ? `?${s}` : ''}`
  }

  return (
    <div className="wrap">
      <h1>{topic ? topic.name : d.nav.fatwas}</h1>
      {topic?.description ? <p className="muted reading">{topic.description}</p> : null}
      <div className="layout-side" style={{ marginTop: '1.5rem' }}>
        <div>
          <FatwaList fatwas={result.docs} locale={locale} />
          <Pager locale={locale} page={result.page ?? 1} totalPages={result.totalPages} makeHref={query} />
        </div>
        <aside className="filters" aria-label={d.topics}>
          <h2 style={{ fontSize: '1.15rem', marginTop: 0 }}>{d.topics}</h2>
          <Link href={`/${locale}/fatwas`} aria-current={!topic}>
            {d.allTopics}
          </Link>
          {topics.map((tp) => (
            <Link key={tp.id} href={`/${locale}/fatwas?topic=${tp.slug}`} aria-current={tp.slug === sp.topic}>
              {tp.name}
            </Link>
          ))}
          {scholars.docs.length ? (
            <>
              <h2 style={{ fontSize: '1.15rem' }}>{d.scholar}</h2>
              {scholars.docs.map((s) => (
                <Link key={s.id} href={`/${locale}/scholars/${s.id}`}>
                  {s.name}
                </Link>
              ))}
            </>
          ) : null}
          <p style={{ marginTop: '1.5rem' }}>
            <Link className="btn secondary small" href={`/${locale}/ask`}>
              {d.ask.title}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  )
}
