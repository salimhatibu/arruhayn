import type { Metadata } from 'next'
import Link from 'next/link'

import { t, type Locale } from '@/i18n/dictionary'
import { getPayloadClient } from '@/lib/payload'
import { search, type SearchType } from '@/lib/search-index'

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ q?: string; type?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).search.title, robots: { index: false } }
}

// FTS snippets mark matches with [[ ]]; turn those into <mark>.
function Snippet({ text }: { text: string }) {
  const parts = text.split(/(\[\[.*?\]\])/g)
  return (
    <p className="muted small" style={{ margin: '0.3rem 0 0' }}>
      {parts.map((p, i) => (p.startsWith('[[') ? <mark key={i}>{p.slice(2, -2)}</mark> : p))}
    </p>
  )
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q = '', type } = await searchParams
  const d = t(locale)
  const query = q.trim().slice(0, 200)
  const filter: SearchType | undefined = type === 'fatwa' || type === 'newsletter' ? type : undefined

  const payload = await getPayloadClient()
  const hits = query ? await search(payload, query, locale, { type: filter, limit: 30 }) : []
  const fatwaIds = hits.filter((h) => h.type === 'fatwa').map((h) => h.id)
  const issueIds = hits.filter((h) => h.type === 'newsletter').map((h) => h.id)
  const [fatwas, issues] = await Promise.all([
    fatwaIds.length
      ? payload.find({ collection: 'fatwas', locale, where: { and: [{ id: { in: fatwaIds } }, { status: { equals: 'published' } }] }, limit: 30, depth: 0 })
      : null,
    issueIds.length
      ? payload.find({ collection: 'newsletters', locale, where: { and: [{ id: { in: issueIds } }, { status: { equals: 'published' } }] }, limit: 30, depth: 0 })
      : null,
  ])
  const fatwaById = new Map(fatwas?.docs.map((f) => [f.id, f]))
  const issueById = new Map(issues?.docs.map((n) => [n.id, n]))
  const results = hits
    .map((h) =>
      h.type === 'fatwa'
        ? fatwaById.get(h.id) && { key: `f${h.id}`, href: `/${locale}/fatwas/${fatwaById.get(h.id)!.number}`, title: fatwaById.get(h.id)!.title, label: d.fatwa, snippet: h.snippet }
        : issueById.get(h.id) && { key: `n${h.id}`, href: `/${locale}/newsletters/${issueById.get(h.id)!.issue}`, title: issueById.get(h.id)!.title, label: d.issue, snippet: h.snippet },
    )
    .filter(Boolean) as { key: string; href: string; title: string; label: string; snippet: string }[]

  const tab = (value: string | undefined, label: string) => {
    const qs = new URLSearchParams({ q: query })
    if (value) qs.set('type', value)
    return (
      <Link className={`tag ${filter === value ? '' : 'lilac'}`} href={`/${locale}/search?${qs}`} aria-current={filter === value}>
        {label}
      </Link>
    )
  }

  return (
    <div className="wrap reading">
      <h1>{d.search.title}</h1>
      <form className="searchbox" role="search" action={`/${locale}/search`}>
        <label htmlFor="q" className="sr-only">
          {d.search.placeholder}
        </label>
        <input id="q" type="search" name="q" defaultValue={query} placeholder={d.search.placeholder} autoFocus={!query} />
        {filter ? <input type="hidden" name="type" value={filter} /> : null}
        <button className="btn" type="submit">
          {d.hero.searchButton}
        </button>
      </form>
      <p className="help">{d.search.hint}</p>

      {query ? (
        <>
          <div className="tags" style={{ margin: '1.5rem 0 0.5rem' }}>
            {tab(undefined, d.search.all)}
            {tab('fatwa', d.nav.fatwas)}
            {tab('newsletter', d.nav.newsletters)}
          </div>
          <p className="muted small">{d.search.results(results.length)}</p>
          {results.length ? (
            <ul className="list">
              {results.map((r) => (
                <li key={r.key}>
                  <span className="label">{r.label}</span>
                  <div>
                    <Link className="title" href={r.href}>
                      {r.title}
                    </Link>
                  </div>
                  <Snippet text={r.snippet} />
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {d.search.none} <Link href={`/${locale}/ask`}>{d.ask.title}</Link>
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}
