import Link from 'next/link'
import type { ReactNode } from 'react'

import { FatwaCover } from '@/components/site/FatwaCover'
import { FatwaList, fatwaTopics, Kicker } from '@/components/site/FatwaList'
import { Icon, type IconName } from '@/components/site/Icon'
import { SubscribeForm } from '@/components/site/SubscribeForm'
import { Tabs } from '@/components/site/Tabs'
import type { Fatwa } from '@/payload-types'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatNumber } from '@/lib/format'
import { excerpt } from '@/lib/lexical'
import { getPayloadClient, getTopics } from '@/lib/payload'
import { turnstileSiteKey } from '@/lib/turnstile'

const intl = (locale: Locale) => (locale === 'ar' ? 'ar-EG' : 'en-GB')

// A hand-drawn loop around the hero's accent word, drawn in when the page loads.
function Scribble({ children }: { children: ReactNode }) {
  return (
    <span className="scribble">
      {children}
      <svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M18 58C14 26 132 8 226 14c56 4 72 30 62 50-14 28-120 34-196 26C42 84 6 70 14 48 22 26 88 14 150 12" />
      </svg>
    </span>
  )
}

function FeatureCard({ fatwa, locale, size }: { fatwa: Fatwa; locale: Locale; size: 'lg' | 'md' }) {
  const topic = fatwaTopics(fatwa)[0]
  return (
    <article className={`feature feature-${size}`} data-reveal>
      <Link className="feature-cover" href={`/${locale}/fatwas/${fatwa.number}`} tabIndex={-1} aria-hidden="true">
        <FatwaCover slug={topic?.slug} number={fatwa.number} size={size} />
      </Link>
      <Kicker topic={topic} locale={locale} />
      <h3 className="feature-title">
        <Link href={`/${locale}/fatwas/${fatwa.number}`}>{fatwa.title}</Link>
      </h3>
      {size === 'lg' ? <p className="entry-excerpt">{excerpt(fatwa.question, 220)}</p> : null}
    </article>
  )
}

function GridCard({
  href,
  kicker,
  icon,
  title,
  body,
  cover,
  date,
}: {
  href: string
  kicker: string
  icon: IconName
  title: string
  body?: string | null
  cover: ReactNode
  date?: string
}) {
  return (
    <article className="grid-card">
      <Link className="grid-cover" href={href} tabIndex={-1} aria-hidden="true">
        {cover}
      </Link>
      <span className="kicker">
        <Icon name={icon} size={14} />
        {kicker}
      </span>
      <h3 className="grid-title">
        <Link href={href}>{title}</Link>
      </h3>
      {body ? <p className="entry-excerpt">{excerpt(body, 150)}</p> : null}
      {date ? <span className="entry-meta">{date}</span> : null}
    </article>
  )
}

const TILE_ICONS: IconName[] = ['book', 'rings', 'scales', 'scroll', 'headphones', 'calendar', 'pen']

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const d = t(locale)
  const payload = await getPayloadClient()
  const published = { status: { equals: 'published' } } as const
  const [news, newsletters, fatwas, allTopics, topics, classes] = await Promise.all([
    payload.find({ collection: 'news', locale, where: published, sort: '-date', limit: 6, depth: 0 }),
    payload.find({ collection: 'newsletters', locale, where: published, sort: '-issue', limit: 6, depth: 0 }),
    payload.find({ collection: 'fatwas', locale, where: published, sort: '-publishedAt', limit: 15, depth: 1 }),
    payload.find({ collection: 'fatwas', where: published, pagination: false, depth: 0, select: { topics: true } }),
    getTopics(locale),
    payload.find({
      collection: 'classes',
      locale,
      where: { and: [{ status: { equals: 'scheduled' } }, { startsAt: { greater_than: new Date().toISOString() } }] },
      sort: 'startsAt',
      limit: 3,
      depth: 0,
    }),
  ])

  const counts = new Map<number, number>()
  for (const f of allTopics.docs) {
    for (const tp of f.topics ?? []) {
      const id = typeof tp === 'object' ? tp.id : tp
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  const [lead, ...rest] = fatwas.docs
  const side = rest.slice(0, 2)
  const latest = rest.slice(2, 8)
  const more = rest.slice(8, 14)

  const fatwaCards = more.map((f) => {
    const topic = fatwaTopics(f)[0]
    return (
      <GridCard
        key={`f${f.id}`}
        href={`/${locale}/fatwas/${f.number}`}
        kicker={topic?.name ?? d.fatwa}
        icon="fatwa"
        title={f.title}
        body={f.question}
        cover={<FatwaCover slug={topic?.slug} number={f.number} />}
      />
    )
  })
  const issueCards = newsletters.docs.map((n) => (
    <GridCard
      key={`n${n.id}`}
      href={`/${locale}/newsletters/${n.issue}`}
      kicker={`${d.issue} ${formatNumber(n.issue, locale)}`}
      icon="mail"
      title={n.title}
      body={n.summary}
      cover={
        <div className="cover cover-md tone-paper" aria-hidden="true">
          <span className="cover-word">{formatNumber(n.issue, locale)}</span>
        </div>
      }
    />
  ))
  const newsCards = news.docs.map((n) => (
    <GridCard
      key={`w${n.id}`}
      href={`/${locale}/news/${n.id}`}
      kicker={d.news.title}
      icon="news"
      title={n.title}
      body={n.summary}
      date={formatDate(n.date, locale)}
      cover={
        <div className="cover cover-md tone-sage" aria-hidden="true">
          <span className="cover-word" lang="ar">
            خبر
          </span>
        </div>
      }
    />
  ))
  const tabs = [
    { key: 'all', label: d.home.all, panel: <div className="card-grid">{[...issueCards.slice(0, 3), ...newsCards.slice(0, 3), ...fatwaCards].slice(0, 6)}</div> },
    { key: 'fatwas', label: d.nav.fatwas, panel: <div className="card-grid">{fatwaCards}</div> },
    ...(issueCards.length ? [{ key: 'newsletters', label: d.nav.newsletters, panel: <div className="card-grid">{issueCards}</div> }] : []),
    ...(newsCards.length ? [{ key: 'news', label: d.news.title, panel: <div className="card-grid">{newsCards}</div> }] : []),
  ]

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap hero-inner">
          <h1>
            {d.hero.titleBefore}
            <br />
            <Scribble>{d.hero.titleAccent}</Scribble>
          </h1>
          <p className="hero-lede">{d.hero.body}</p>
          <form className="hero-search" action={`/${locale}/search`} role="search">
            <label htmlFor="home-q" className="sr-only">
              {d.nav.search}
            </label>
            <Icon name="search" size={20} />
            <input id="home-q" type="search" name="q" placeholder={d.hero.searchPlaceholder} />
            <button type="submit" aria-label={d.hero.searchButton}>
              <Icon name="arrow" size={20} />
            </button>
          </form>
          <div className="hero-chips">
            {topics.slice(0, 7).map((tp) => (
              <Link key={tp.id} className="chip" href={`/${locale}/fatwas?topic=${tp.slug}`}>
                {tp.name}
              </Link>
            ))}
            <Link className="chip chip-outline" href={`/${locale}/fatwas`}>
              <Icon name="book" size={15} />
              {d.hero.exploreTopics}
            </Link>
          </div>
        </div>
      </section>

      {lead ? (
        <section className="band">
          <div className="wrap">
            <h2 className="band-title">{d.home.featured}</h2>
            <div className="featured">
              <FeatureCard fatwa={lead} locale={locale} size="lg" />
              <div className="featured-side">
                {side.map((f) => (
                  <FeatureCard key={f.id} fatwa={f} locale={locale} size="md" />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="band">
          <div className="wrap">
            <p className="muted">{d.noFatwas}</p>
          </div>
        </section>
      )}

      {latest.length ? (
        <section className="band band-white">
          <div className="wrap">
            <h2 className="band-title">{d.home.latest}</h2>
            <div className="with-aside">
              <div>
                <FatwaList fatwas={latest} locale={locale} />
                <Link className="more-link" href={`/${locale}/fatwas`}>
                  {d.home.exploreMore}
                  <Icon name="arrow" size={16} />
                </Link>
              </div>
              <aside className="aside">
                <h3 className="aside-title">{d.home.topicsTitle}</h3>
                <ul className="topic-index">
                  {topics.map((tp) => (
                    <li key={tp.id}>
                      <Link href={`/${locale}/fatwas?topic=${tp.slug}`}>
                        <span>{tp.name}</span>
                        <span className="count">{formatNumber(counts.get(tp.id) ?? 0, locale)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="aside-cta">
                  <h3 className="aside-title">{d.home.askTitle}</h3>
                  <p>{d.home.askBody}</p>
                  <Link className="btn" href={`/${locale}/ask`}>
                    {d.home.askButton}
                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      {fatwaCards.length ? (
        <section className="band">
          <div className="wrap" data-reveal>
            <Tabs tabs={tabs} label={d.home.fromTheSite} />
          </div>
        </section>
      ) : null}

      {classes.docs.length ? (
        <section className="band band-pattern">
          <div className="wrap">
            <div className="panel" data-reveal>
              <div className="panel-text">
                <span className="eyebrow">{d.home.upcoming}</span>
                <h2>{d.home.upcomingTitle}</h2>
                <p>{d.home.upcomingBody}</p>
                <Link className="more-link" href={`/${locale}/live`}>
                  {d.home.allClasses}
                  <Icon name="arrow" size={16} />
                </Link>
              </div>
              <div className="panel-side">
                {classes.docs.map((c) => {
                  const when = new Date(c.startsAt)
                  return (
                    <Link key={c.id} className="session" href={`/${locale}/live/${c.id}`}>
                      <span className="date-tile">
                        <span className="date-tile-month">
                          {new Intl.DateTimeFormat(intl(locale), { month: 'short', timeZone: 'UTC' }).format(when)}
                        </span>
                        <span className="date-tile-day">
                          {new Intl.DateTimeFormat(intl(locale), { day: 'numeric', timeZone: 'UTC' }).format(when)}
                        </span>
                        <span className="date-tile-week">
                          {new Intl.DateTimeFormat(intl(locale), { weekday: 'short', timeZone: 'UTC' }).format(when)}
                        </span>
                      </span>
                      <span className="session-text">
                        <strong>{c.title}</strong>
                        <span>
                          {new Intl.DateTimeFormat(intl(locale), {
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZone: 'UTC',
                            timeZoneName: 'short',
                          }).format(when)}
                        </span>
                      </span>
                      <span className="btn small pill-btn">{d.home.reserve}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="band band-white newsletter-band">
        <div className="wrap" data-reveal>
          <div className="tiles" aria-hidden="true">
            {TILE_ICONS.map((name, i) => (
              <span key={name} className={`tile tile-${i % 3}`}>
                <Icon name={name} size={26} />
              </span>
            ))}
          </div>
          <h2>{d.home.newsletterTitle}</h2>
          <p>{d.home.newsletterBody}</p>
          <SubscribeForm locale={locale} siteKey={turnstileSiteKey()} />
        </div>
      </section>
    </>
  )
}
