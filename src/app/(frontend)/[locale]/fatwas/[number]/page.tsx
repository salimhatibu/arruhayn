import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { BookmarkButton } from '@/components/site/BookmarkButton'
import { FatwaList } from '@/components/site/FatwaList'
import { RichText } from '@/components/site/RichText'
import { ShareButton } from '@/components/site/ShareButton'
import type { Fatwa, Topic } from '@/payload-types'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatNumber, safeHref, textDir } from '@/lib/format'
import { excerpt, lexicalToText } from '@/lib/lexical'
import { getGlossary, getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale; number: string }> }

const getFatwa = cache(async (locale: Locale, number: number) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'fatwas',
    locale,
    where: { and: [{ number: { equals: number } }, { status: { equals: 'published' } }] },
    limit: 1,
    depth: 1,
  })
  return (res.docs[0] as Fatwa | undefined) ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, number } = await params
  const fatwa = await getFatwa(locale, Number(number))
  if (!fatwa) return {}
  return {
    title: fatwa.title,
    description: excerpt(fatwa.question, 160),
    alternates: { languages: { en: `/en/fatwas/${number}`, ar: `/ar/fatwas/${number}` } },
  }
}

export default async function FatwaPage({ params }: Props) {
  const { locale, number } = await params
  const n = Number(number)
  if (!Number.isInteger(n)) notFound()
  const fatwa = await getFatwa(locale, n)
  if (!fatwa) notFound()
  const d = t(locale)
  const glossary = await getGlossary(locale)
  const scholar = typeof fatwa.scholar === 'object' ? fatwa.scholar : null
  const reviewer = typeof fatwa.reviewedBy === 'object' ? fatwa.reviewedBy : null
  const mainTopic = (fatwa.topics ?? []).find((x) => typeof x === 'object') as Topic | undefined
  const sameTopic = mainTopic
    ? (
        await (
          await getPayloadClient()
        ).find({
          collection: 'fatwas',
          locale,
          where: {
            and: [
              { status: { equals: 'published' } },
              { topics: { contains: mainTopic.id } },
              { id: { not_equals: fatwa.id } },
            ],
          },
          sort: '-publishedAt',
          limit: 4,
          depth: 1,
        })
      ).docs
    : []
  const related = (fatwa.related ?? []).filter(
    (r): r is Fatwa => typeof r === 'object' && r.status === 'published',
  )

  // Structured data so search engines show the question and answer.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: fatwa.title,
      text: fatwa.question,
      answerCount: 1,
      dateCreated: fatwa.publishedAt,
      acceptedAnswer: {
        '@type': 'Answer',
        text: excerpt(lexicalToText(fatwa.answer as never), 1200),
        dateCreated: fatwa.publishedAt,
        ...(scholar ? { author: { '@type': 'Person', name: scholar.name } } : {}),
      },
    },
  }

  return (
    <article className="wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <div className="article-grid">
        <div>
          <p className="section-kicker">
            {d.fatwaNumber} {formatNumber(fatwa.number ?? 0, locale)}
          </p>
          <nav className="crumbs" aria-label={d.nav.fatwas}>
            <Link href={`/${locale}/fatwas`}>{d.nav.fatwas}</Link>
            {(fatwa.topics ?? []).map((tp) =>
              typeof tp === 'object' ? (
                <Link key={tp.id} href={`/${locale}/fatwas?topic=${tp.slug}`}>
                  {tp.name}
                </Link>
              ) : null,
            )}
          </nav>
          <h1 {...textDir(fatwa.title, locale)}>{fatwa.title}</h1>
          <div className="byline">
            {fatwa.publishedAt ? (
              <span>
                {d.published} {formatDate(fatwa.publishedAt, locale)}
              </span>
            ) : null}
            {scholar ? (
              <span>
                {d.answeredBy}:{' '}
                <Link href={`/${locale}/scholars/${scholar.id}`}>{scholar.name}</Link>
              </span>
            ) : null}
            {fatwa.translatedBy ? (
              <span>
                {d.translatedBy}: {fatwa.translatedBy}
              </span>
            ) : null}
            {reviewer ? (
              <span>
                {d.reviewedBy}: {reviewer.name}
              </span>
            ) : null}
            <BookmarkButton
              type="f"
              id={fatwa.number ?? fatwa.id}
              title={fatwa.title}
              href={`/fatwas/${fatwa.number}`}
              labels={{ save: d.saved.save, saved: d.saved.savedLabel }}
            />
            <ShareButton title={fatwa.title} path={`/${locale}/fatwas/${fatwa.number}`} locale={locale} />
          </div>

          <section className="question-box" aria-labelledby="q-label">
            <div className="label" id="q-label">
              {d.question}
            </div>
            <div className="prose" {...textDir(fatwa.question, locale)}>
              {fatwa.question.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          <section aria-labelledby="a-label" style={{ marginTop: '2rem' }}>
            <div className="label" id="a-label">
              {d.answer}
            </div>
            <RichText
              value={fatwa.answer}
              glossary={glossary}
              className="prose dropcap-first"
              {...textDir(lexicalToText(fatwa.answer as never), locale)}
            />
          </section>

          {fatwa.sources?.length || fatwa.originalUrl ? (
            <section className="sources">
              <h2>{d.sources}</h2>
              <ul>
                {(fatwa.sources ?? []).map((s) => (
                  <li key={s.id}>{safeHref(s.url) ? <a href={safeHref(s.url)} rel="noopener noreferrer" target="_blank">{s.reference}</a> : s.reference}</li>
                ))}
                {fatwa.originalUrl ? (
                  <li>
                    {fatwa.publishedBy ? `${d.firstPublishedOn} ` : null}
                    <a href={fatwa.originalUrl} rel="noopener noreferrer" target="_blank">
                      {fatwa.publishedBy || d.originalSource}
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {related.length ? (
            <section className="paper-section">
              <h2 className="rule-head">{d.relatedFatwas}</h2>
              <FatwaList fatwas={related} locale={locale} />
            </section>
          ) : null}

          <p className="disclaimer-note">{d.ask.disclaimer}</p>
        </div>
        <aside className="article-aside">
          {sameTopic.length ? (
            <div>
              <h2 className="rule-head">
                {d.moreOn} {mainTopic?.name}
              </h2>
              <FatwaList fatwas={sameTopic} locale={locale} />
              <Link className="read-link" href={`/${locale}/fatwas?topic=${mainTopic?.slug}`}>
                {d.viewAll}
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </article>
  )
}
