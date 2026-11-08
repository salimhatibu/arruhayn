import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { BookmarkButton } from '@/components/site/BookmarkButton'
import { FatwaList } from '@/components/site/FatwaList'
import { RichText } from '@/components/site/RichText'
import type { Fatwa } from '@/payload-types'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatNumber } from '@/lib/format'
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
  const related = (fatwa.related ?? []).filter((r): r is Fatwa => typeof r === 'object' && r.status === 'published')

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="reading">
        <div className="tags" style={{ marginBottom: '1rem' }}>
          {(fatwa.topics ?? []).map((tp) =>
            typeof tp === 'object' ? (
              <Link key={tp.id} className="tag" href={`/${locale}/topics/${tp.slug}`}>
                {tp.name}
              </Link>
            ) : null,
          )}
        </div>
        <h1>{fatwa.title}</h1>
        <div className="byline">
          <span>
            {d.fatwaNumber} {formatNumber(fatwa.number ?? 0, locale)}
          </span>
          {fatwa.publishedAt ? (
            <span>
              {d.published} {formatDate(fatwa.publishedAt, locale)}
            </span>
          ) : null}
          {scholar ? (
            <span>
              {d.answeredBy}: <Link href={`/${locale}/scholars/${scholar.id}`}>{scholar.name}</Link>
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
        </div>

        <section className="question-box" aria-labelledby="q-label">
          <div className="label" id="q-label">
            {d.question}
          </div>
          <div className="prose">
            {fatwa.question.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section aria-labelledby="a-label" style={{ marginTop: '2rem' }}>
          <div className="label" id="a-label">
            {d.answer}
          </div>
          <RichText value={fatwa.answer} glossary={glossary} />
        </section>

        {fatwa.sources?.length || fatwa.originalUrl ? (
          <section>
            <h2>{d.sources}</h2>
            <ul>
              {(fatwa.sources ?? []).map((s) => (
                <li key={s.id}>{s.url ? <a href={s.url}>{s.reference}</a> : s.reference}</li>
              ))}
              {fatwa.originalUrl ? (
                <li>
                  <a href={fatwa.originalUrl} rel="noopener noreferrer" target="_blank">
                    {d.originalSource}
                  </a>
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}

        {related.length ? (
          <section>
            <h2>{d.relatedFatwas}</h2>
            <FatwaList fatwas={related} locale={locale} />
          </section>
        ) : null}

        <p className="muted small" style={{ marginTop: '3rem' }}>
          {d.ask.disclaimer}
        </p>
      </div>
    </article>
  )
}
