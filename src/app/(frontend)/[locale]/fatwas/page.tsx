import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { FatwaList } from '@/components/site/FatwaList'
import { Icon } from '@/components/site/Icon'
import { Pager } from '@/components/site/Pager'
import type { Fatwa } from '@/payload-types'
import { t, type Locale } from '@/i18n/dictionary'
import { formatNumber, textDir } from '@/lib/format'
import { getPayloadClient, getTopics } from '@/lib/payload'
import { search } from '@/lib/search-index'

type Props = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ topic?: string; scholar?: string; page?: string; q?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params
  const { q } = await searchParams
  const d = t(locale)
  return { title: q ? d.paper.resultsFor(q) : d.nav.fatwas, robots: q ? { index: false } : undefined }
}

export default async function FatwasPage({ params, searchParams }: Props) {
  const { locale } = await params
  const sp = await searchParams
  const d = t(locale)
  const page = Math.max(1, Number(sp.page) || 1)
  const query = (sp.q ?? '').trim().slice(0, 200)
  const payload = await getPayloadClient()
  const published = { status: { equals: 'published' } } as const
  const [topics, scholars, all] = await Promise.all([
    getTopics(locale),
    payload.find({ collection: 'scholars', locale, limit: 100, depth: 0, sort: 'name' }),
    payload.find({ collection: 'fatwas', where: published, pagination: false, depth: 0, select: { topics: true } }),
  ])
  const counts = new Map<number, number>()
  for (const f of all.docs) {
    for (const tp of f.topics ?? []) {
      const id = typeof tp === 'object' ? tp.id : tp
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }

  const topic = topics.find((x) => x.slug === sp.topic)
  const scholar = scholars.docs.find((s) => String(s.id) === sp.scholar)

  // A search shows matching fatwas in order of relevance, and matching newsletter issues below.
  let fatwas: Fatwa[] = []
  let issues: { id: number; issue: number; title: string }[] = []
  let pager: { page: number; totalPages: number } | null = null
  if (query) {
    const hits = await search(payload, query, locale, { limit: 40 })
    const fatwaIds = hits.filter((h) => h.type === 'fatwa').map((h) => h.id)
    const issueIds = hits.filter((h) => h.type === 'newsletter').map((h) => h.id)
    const [found, foundIssues] = await Promise.all([
      fatwaIds.length
        ? payload.find({ collection: 'fatwas', locale, where: { and: [{ id: { in: fatwaIds } }, published] }, limit: 40, depth: 1 })
        : null,
      issueIds.length
        ? payload.find({ collection: 'newsletters', locale, where: { and: [{ id: { in: issueIds } }, published] }, limit: 20, depth: 0 })
        : null,
    ])
    const byId = new Map(found?.docs.map((f) => [f.id, f]))
    fatwas = fatwaIds.map((id) => byId.get(id)).filter((f): f is Fatwa => Boolean(f))
    issues = foundIssues?.docs ?? []
  } else {
    const where: Where = { ...published }
    if (topic) where.topics = { contains: topic.id }
    if (scholar) where.scholar = { equals: scholar.id }
    const result = await payload.find({ collection: 'fatwas', locale, where, sort: '-number', limit: 20, page, depth: 1 })
    fatwas = result.docs
    pager = { page: result.page ?? 1, totalPages: result.totalPages }
  }

  const href = (p: number) => {
    const q = new URLSearchParams()
    if (sp.topic) q.set('topic', sp.topic)
    if (sp.scholar) q.set('scholar', sp.scholar)
    if (p > 1) q.set('page', String(p))
    const s = q.toString()
    return `/${locale}/fatwas${s ? `?${s}` : ''}`
  }

  return (
    <div className="wrap">
      <header className="section-masthead">
        <p className="section-kicker">
          {d.paper.archive} · <span lang={locale === 'ar' ? 'en' : 'ar'}>{locale === 'ar' ? 'The archive' : 'الأرشيف'}</span>
        </p>
        <h1>{query ? d.paper.resultsFor(query) : topic ? topic.name : scholar ? `${d.fatwasBy} ${scholar.name}` : d.nav.fatwas}</h1>
        {topic?.description && !query ? <p className="section-deck">{topic.description}</p> : null}
        <form className="archive-search" action={`/${locale}/fatwas`} role="search">
          <Icon name="search" size={18} />
          <label htmlFor="archive-q" className="sr-only">
            {d.nav.search}
          </label>
          <input id="archive-q" type="search" name="q" defaultValue={query} placeholder={d.hero.searchPlaceholder} />
          <button className="read-link" type="submit">
            {d.hero.searchButton}
          </button>
        </form>
        <p className="byline-mono">
          {query ? (
            <>
              <span>{d.search.results(fatwas.length + issues.length)}</span>
              <Link href={`/${locale}/fatwas`}>{d.paper.clearSearch}</Link>
            </>
          ) : (
            <span>
              {formatNumber(all.docs.length, locale)} {d.paper.published}
            </span>
          )}
          <span>{d.search.hint}</span>
        </p>
      </header>

      <div className="layout-side">
        <div>
          {query && !fatwas.length && !issues.length ? (
            <p className="story-deck">
              {d.search.none} <Link href={`/${locale}/ask`}>{d.ask.title}</Link>
            </p>
          ) : (
            <FatwaList fatwas={fatwas} locale={locale} />
          )}
          {issues.length ? (
            <section className="paper-section">
              <h2 className="rule-head">{d.paper.inNewsletters}</h2>
              <ul className="story-list">
                {issues.map((n) => (
                  <li key={n.id} className="story">
                    <div className="dateline">
                      <span className="boxed">
                        {d.issue} {formatNumber(n.issue, locale)}
                      </span>
                    </div>
                    <h3 className="story-title" {...textDir(n.title, locale)}>
                      <Link href={`/${locale}/newsletters/${n.issue}`}>{n.title}</Link>
                    </h3>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {pager ? <Pager locale={locale} page={pager.page} totalPages={pager.totalPages} makeHref={href} /> : null}
        </div>
        <aside className="filters" aria-label={d.topics}>
          <h2 className="rule-head">{d.topics}</h2>
          <Link href={`/${locale}/fatwas`} aria-current={!topic && !scholar && !query}>
            <span>{d.allTopics}</span>
            <span className="count">{formatNumber(all.docs.length, locale)}</span>
          </Link>
          {topics.map((tp) => (
            <Link key={tp.id} href={`/${locale}/fatwas?topic=${tp.slug}`} aria-current={tp.slug === sp.topic}>
              <span>{tp.name}</span>
              <span className="count">{formatNumber(counts.get(tp.id) ?? 0, locale)}</span>
            </Link>
          ))}
          {scholars.docs.length ? (
            <>
              <h2 className="rule-head">{d.scholar}</h2>
              {scholars.docs.map((s) => (
                <Link key={s.id} href={`/${locale}/fatwas?scholar=${s.id}`} aria-current={s.id === scholar?.id}>
                  {s.name}
                </Link>
              ))}
            </>
          ) : null}
          <div className="almanac" style={{ marginTop: '2rem' }}>
            <p className="almanac-label">{d.home.askTitle}</p>
            <p>{d.home.askBody}</p>
            <Link className="read-link" href={`/${locale}/ask`}>
              {d.home.askButton}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
