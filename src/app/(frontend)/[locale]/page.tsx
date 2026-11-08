import Link from 'next/link'
import type { ReactNode } from 'react'

import { Dateline, fatwaTopics, StoryActions } from '@/components/site/FatwaList'
import { HeroArt } from '@/components/site/HeroArt'
import { Icon, type IconName } from '@/components/site/Icon'
import { SubscribeForm } from '@/components/site/SubscribeForm'
import { Tabs } from '@/components/site/Tabs'
import type { Fatwa } from '@/payload-types'
import { t, type Locale } from '@/i18n/dictionary'
import { fastNotice } from '@/lib/fasting'
import { formatDate, formatNumber, textDir } from '@/lib/format'
import { formatGregorian, formatHijri, toHijri, utcDay } from '@/lib/hijri'
import { excerpt } from '@/lib/lexical'
import { getMonthOverrides, getPayloadClient, getTopics } from '@/lib/payload'
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

function Byline({ fatwa, locale }: { fatwa: Fatwa; locale: Locale }) {
  const scholar = typeof fatwa.scholar === 'object' ? fatwa.scholar : null
  return (
    <p className="byline-mono">
      {scholar ? <span>{scholar.name}</span> : null}
      {fatwa.publishedAt ? <span>{formatDate(fatwa.publishedAt, locale)}</span> : null}
    </p>
  )
}

// A story in the "In this edition" grid or the tabs: numbered, boxed label, headline, deck.
function Story({
  no,
  label,
  labelHref,
  href,
  title,
  deck,
  meta,
  locale,
}: {
  no: number
  label?: string
  labelHref?: string
  href: string
  title: string
  deck?: string | null
  meta?: ReactNode
  locale: Locale
}) {
  return (
    <article className="story" data-reveal>
      <div className="dateline">
        <span className="dateline-no">{String(no).padStart(2, '0')}</span>
        {label ? (
          labelHref ? (
            <Link className="boxed" href={labelHref}>
              {label}
            </Link>
          ) : (
            <span className="boxed">{label}</span>
          )
        ) : null}
      </div>
      <h3 className="story-title" {...textDir(title, locale)}>
        <Link href={`/${locale}${href}`}>{title}</Link>
      </h3>
      {deck ? (
        <p className="story-deck" {...textDir(deck, locale)}>
          {excerpt(deck, 170)}
        </p>
      ) : null}
      {meta}
      <StoryActions href={href} title={title} locale={locale} />
    </article>
  )
}

const TILE_ICONS: IconName[] = [
  'book',
  'rings',
  'scales',
  'scroll',
  'headphones',
  'calendar',
  'pen',
]

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const d = t(locale)
  const payload = await getPayloadClient()
  const published = { status: { equals: 'published' } } as const
  const [news, newsletters, fatwas, allTopics, topics, classes, overrides] = await Promise.all([
    payload.find({
      collection: 'news',
      locale,
      where: published,
      sort: '-date',
      limit: 6,
      depth: 0,
    }),
    payload.find({
      collection: 'newsletters',
      locale,
      where: published,
      sort: '-issue',
      limit: 6,
      depth: 0,
    }),
    payload.find({
      collection: 'fatwas',
      locale,
      where: published,
      sort: '-publishedAt',
      limit: 15,
      depth: 1,
    }),
    payload.find({
      collection: 'fatwas',
      where: published,
      pagination: false,
      depth: 0,
      select: { topics: true },
    }),
    getTopics(locale),
    payload.find({
      collection: 'classes',
      locale,
      where: {
        and: [
          { status: { equals: 'scheduled' } },
          { startsAt: { greater_than: new Date().toISOString() } },
        ],
      },
      sort: 'startsAt',
      limit: 3,
      depth: 0,
    }),
    getMonthOverrides(),
  ])

  const today = utcDay(new Date())
  const hijri = toHijri(today, overrides)
  const fast = fastNotice(today, overrides)
  const counts = new Map<number, number>()
  for (const f of allTopics.docs) {
    for (const tp of f.topics ?? []) {
      const id = typeof tp === 'object' ? tp.id : tp
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  const [lead, ...rest] = fatwas.docs
  const side = rest.slice(0, 2)
  const edition = rest.slice(2, 8)
  const more = rest.slice(8, 14)
  const total = allTopics.docs.length

  const fatwaStories = more.map((f, i) => {
    const topic = fatwaTopics(f)[0]
    return (
      <Story
        key={`f${f.id}`}
        no={i + 1}
        label={topic?.name}
        labelHref={topic ? `/${locale}/fatwas?topic=${topic.slug}` : undefined}
        href={`/fatwas/${f.number}`}
        title={f.title}
        deck={f.question}
        locale={locale}
      />
    )
  })
  const issueStories = newsletters.docs.map((n, i) => (
    <Story
      key={`n${n.id}`}
      no={i + 1}
      label={`${d.issue} ${formatNumber(n.issue, locale)}`}
      href={`/newsletters/${n.issue}`}
      title={n.title}
      deck={n.summary}
      locale={locale}
    />
  ))
  const newsStories = news.docs.map((n, i) => (
    <Story
      key={`w${n.id}`}
      no={i + 1}
      label={d.news.title}
      href={`/news/${n.id}`}
      title={n.title}
      deck={n.summary}
      meta={<p className="byline-mono">{formatDate(n.date, locale)}</p>}
      locale={locale}
    />
  ))
  const tabs = [
    {
      key: 'all',
      label: d.home.all,
      panel: (
        <div className="paper-grid">
          {[...issueStories.slice(0, 3), ...newsStories.slice(0, 3), ...fatwaStories].slice(0, 6)}
        </div>
      ),
    },
    { key: 'fatwas', label: d.nav.fatwas, panel: <div className="paper-grid">{fatwaStories}</div> },
    ...(issueStories.length
      ? [
          {
            key: 'newsletters',
            label: d.nav.newsletters,
            panel: <div className="paper-grid">{issueStories}</div>,
          },
        ]
      : []),
    ...(newsStories.length
      ? [
          {
            key: 'news',
            label: d.news.title,
            panel: <div className="paper-grid">{newsStories}</div>,
          },
        ]
      : []),
  ]

  return (
    <>
      <section className="hero">
        <HeroArt />
        <div className="wrap hero-inner">
          <h1>
            {d.hero.titleBefore}
            <br />
            <Scribble>{d.hero.titleAccent}</Scribble>
          </h1>
          <p className="hero-lede">{d.hero.body}</p>
          <form className="hero-search" action={`/${locale}/fatwas`} role="search">
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
        <a className="scroll-cue" href="#front-page">
          {d.paper.scroll}
          <span aria-hidden="true" />
        </a>
      </section>

      <div className="paper" id="front-page">
        <div className="wrap">
          <div className="edition-bar">
            <span>
              {d.paper.edition} {formatNumber(total, locale)}
            </span>
            <span className="edition-motto">{d.paper.motto}</span>
            <span>{formatHijri(hijri, locale)}</span>
          </div>

          {lead ? (
            <section className="front" aria-label={d.paper.front}>
              <article className="front-lead">
                <p className="section-kicker">
                  {d.paper.front} ·{' '}
                  <span lang={locale === 'ar' ? 'en' : 'ar'}>{d.paper.frontAr}</span>
                </p>
                <Dateline fatwa={lead} locale={locale} />
                <h2 className="front-title" {...textDir(lead.title, locale)}>
                  <Link href={`/${locale}/fatwas/${lead.number}`}>{lead.title}</Link>
                </h2>
                <p className="front-deck dropcap" {...textDir(lead.question, locale)}>
                  {excerpt(lead.question, 320)}
                </p>
                <Byline fatwa={lead} locale={locale} />
                <StoryActions
                  href={`/fatwas/${lead.number}`}
                  title={lead.title}
                  locale={locale}
                  label={d.readFatwa}
                />
              </article>

              <div className="front-side">
                {side.map((f) => (
                  <article key={f.id} className="story">
                    <Dateline fatwa={f} locale={locale} />
                    <h3 className="story-title" {...textDir(f.title, locale)}>
                      <Link href={`/${locale}/fatwas/${f.number}`}>{f.title}</Link>
                    </h3>
                    <p className="story-deck" {...textDir(f.question, locale)}>
                      {excerpt(f.question, 140)}
                    </p>
                    <StoryActions href={`/fatwas/${f.number}`} title={f.title} locale={locale} />
                  </article>
                ))}
              </div>

              <aside className="front-aside">
                <p className="section-kicker">
                  {d.paper.almanac} ·{' '}
                  <span lang={locale === 'ar' ? 'en' : 'ar'}>
                    {locale === 'ar' ? 'Almanac' : 'تقويم'}
                  </span>
                </p>
                <div className="almanac">
                  <p className="almanac-label">{d.paper.today}</p>
                  <p className="almanac-date">{formatHijri(hijri, locale)}</p>
                  <p className="almanac-alt" lang={locale === 'ar' ? 'en' : 'ar'}>
                    {formatHijri(hijri, locale === 'ar' ? 'en' : 'ar')}
                  </p>
                  {fast ? (
                    <p>
                      <Link href={`/${locale}/calendar`}>
                        {fast.when === 'today' ? d.fastToday : d.fastTomorrow}:{' '}
                        {fast.entry.title[locale]}
                      </Link>
                    </p>
                  ) : null}
                  <p className="byline-mono almanac-foot">
                    <span>{formatGregorian(today, locale)}</span>
                  </p>
                </div>
                <div className="almanac">
                  <p className="almanac-label">{d.home.askTitle}</p>
                  <p>{d.home.askBody}</p>
                  <Link className="read-link" href={`/${locale}/ask`}>
                    {d.home.askButton}
                  </Link>
                </div>
              </aside>
            </section>
          ) : (
            <p className="story-deck">{d.noFatwas}</p>
          )}

          {edition.length ? (
            <section className="paper-section">
              <h2 className="rule-head">{d.paper.inThisEdition}</h2>
              <div className="paper-grid">
                {edition.map((f, i) => {
                  const topic = fatwaTopics(f)[0]
                  return (
                    <Story
                      key={f.id}
                      no={i + 1}
                      label={topic?.name}
                      labelHref={topic ? `/${locale}/fatwas?topic=${topic.slug}` : undefined}
                      href={`/fatwas/${f.number}`}
                      title={f.title}
                      deck={f.question}
                      meta={<Byline fatwa={f} locale={locale} />}
                      locale={locale}
                    />
                  )
                })}
              </div>
              <Link className="read-link more" href={`/${locale}/fatwas`}>
                {d.home.exploreMore}
              </Link>
            </section>
          ) : null}

          <section className="paper-section">
            <h2 className="rule-head">{d.home.topicsTitle}</h2>
            <ul className="topic-columns">
              {topics.map((tp) => (
                <li key={tp.id}>
                  <Link href={`/${locale}/fatwas?topic=${tp.slug}`}>
                    <span>{tp.name}</span>
                    <span className="count">{formatNumber(counts.get(tp.id) ?? 0, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {fatwaStories.length ? (
            <section className="paper-section" data-reveal>
              <h2 className="rule-head">{d.home.fromTheSite}</h2>
              <Tabs tabs={tabs} label={d.home.fromTheSite} />
            </section>
          ) : null}

          {classes.docs.length ? (
            <section className="paper-section">
              <div className="panel" data-reveal>
                <div className="panel-text">
                  <span className="eyebrow">{d.home.upcoming}</span>
                  <h2>{d.home.upcomingTitle}</h2>
                  <p>{d.home.upcomingBody}</p>
                  <Link className="read-link" href={`/${locale}/live`}>
                    {d.home.allClasses}
                  </Link>
                </div>
                <div className="panel-side">
                  {classes.docs.map((c) => {
                    const when = new Date(c.startsAt)
                    const fmt = (o: Intl.DateTimeFormatOptions) =>
                      new Intl.DateTimeFormat(intl(locale), { ...o, timeZone: 'UTC' }).format(when)
                    return (
                      <Link key={c.id} className="session" href={`/${locale}/live/${c.id}`}>
                        <span className="date-tile">
                          <span className="date-tile-month">{fmt({ month: 'short' })}</span>
                          <span className="date-tile-day">{fmt({ day: 'numeric' })}</span>
                          <span className="date-tile-week">{fmt({ weekday: 'short' })}</span>
                        </span>
                        <span className="session-text">
                          <strong>{c.title}</strong>
                          <span>
                            {fmt({ hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
                          </span>
                        </span>
                        <span className="btn small pill-btn">{d.home.reserve}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <section className="newsletter-band">
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
