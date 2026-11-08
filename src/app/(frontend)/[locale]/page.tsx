import Link from 'next/link'

import { HeroLetters } from '@/components/site/HeroLetters'
import { SubscribeForm } from '@/components/site/SubscribeForm'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatNumber } from '@/lib/format'
import { getPayloadClient, getTopics } from '@/lib/payload'
import { turnstileSiteKey } from '@/lib/turnstile'

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const d = t(locale)
  const payload = await getPayloadClient()
  const [news, newsletters, fatwas, topics] = await Promise.all([
    payload.find({ collection: 'news', locale, where: { status: { equals: 'published' } }, sort: '-date', limit: 3, depth: 0 }),
    payload.find({ collection: 'newsletters', locale, where: { status: { equals: 'published' } }, sort: '-issue', limit: 3, depth: 0 }),
    payload.find({ collection: 'fatwas', locale, where: { status: { equals: 'published' } }, sort: '-publishedAt', limit: 5, depth: 1 }),
    getTopics(locale),
  ])

  return (
    <>
      <section className="hero">
        <HeroLetters />
        <div className="wrap">
          <h1>{d.hero.title}</h1>
          <p>{d.hero.body}</p>
          <form className="searchbox" action={`/${locale}/search`} role="search">
            <label htmlFor="home-q" className="sr-only">
              {d.nav.search}
            </label>
            <input id="home-q" type="search" name="q" placeholder={d.hero.searchPlaceholder} />
            <button className="btn" type="submit">
              {d.hero.searchButton}
            </button>
          </form>
        </div>
      </section>

      <div className="wrap">
        <div className="grid-3">
          <section>
            <div className="section-head">
              <h2>{d.latestNews}</h2>
              <Link href={`/${locale}/news`} className="small">
                {d.viewAll}
              </Link>
            </div>
            {news.docs.length ? (
              <ul className="list">
                {news.docs.map((n) => (
                  <li key={n.id}>
                    <Link className="title" href={`/${locale}/news/${n.id}`}>
                      {n.title}
                    </Link>
                    <div className="meta">{formatDate(n.date, locale)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{d.news.none}</p>
            )}
          </section>

          <section>
            <div className="section-head">
              <h2>{d.latestNewsletters}</h2>
              <Link href={`/${locale}/newsletters`} className="small">
                {d.viewAll}
              </Link>
            </div>
            <div className="stack" style={{ marginTop: '0.85rem' }}>
              {newsletters.docs.length ? (
                newsletters.docs.map((n) => (
                  <Link key={n.id} className="card issue-card" href={`/${locale}/newsletters/${n.issue}`}>
                    <span className="label">
                      {d.issue} {formatNumber(n.issue, locale)}
                    </span>
                    <h3>{n.title}</h3>
                    {n.summary ? <p className="muted small" style={{ margin: 0 }}>{n.summary}</p> : null}
                  </Link>
                ))
              ) : (
                <p className="muted">{d.newsletter.none}</p>
              )}
            </div>
          </section>

          <section>
            <div className="section-head">
              <h2>{d.latestFatwas}</h2>
              <Link href={`/${locale}/fatwas`} className="small">
                {d.viewAll}
              </Link>
            </div>
            {fatwas.docs.length ? (
              <ul className="list">
                {fatwas.docs.map((f) => {
                  const topic = (f.topics ?? []).find((x) => typeof x === 'object')
                  return (
                    <li key={f.id}>
                      {topic && typeof topic === 'object' ? (
                        <Link className="tag" href={`/${locale}/topics/${topic.slug}`}>
                          {topic.name}
                        </Link>
                      ) : null}
                      <div style={{ marginTop: '0.35rem' }}>
                        <Link className="title" href={`/${locale}/fatwas/${f.number}`}>
                          {f.title}
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="muted">{d.noFatwas}</p>
            )}
          </section>
        </div>

        <section>
          <h2>{d.browseTopics}</h2>
          <div className="tags">
            {topics.map((topic) => (
              <Link key={topic.id} className="tag" href={`/${locale}/topics/${topic.slug}`}>
                {topic.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="card" style={{ marginTop: '3rem', maxWidth: 680 }}>
          <h2 style={{ marginTop: 0 }}>{d.newsletter.subscribeTitle}</h2>
          <p className="muted">{d.newsletter.subscribeBody}</p>
          <SubscribeForm locale={locale} siteKey={turnstileSiteKey()} />
        </section>
      </div>
    </>
  )
}
