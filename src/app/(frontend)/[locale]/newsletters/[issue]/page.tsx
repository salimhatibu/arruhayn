/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { BookmarkButton } from '@/components/site/BookmarkButton'
import { RichText } from '@/components/site/RichText'
import { SubscribeForm } from '@/components/site/SubscribeForm'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatNumber } from '@/lib/format'
import { getGlossary, getPayloadClient } from '@/lib/payload'
import { turnstileSiteKey } from '@/lib/turnstile'

type Props = { params: Promise<{ locale: Locale; issue: string }> }

const getIssue = cache(async (locale: Locale, issue: number) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'newsletters',
    locale,
    where: { and: [{ issue: { equals: issue } }, { status: { equals: 'published' } }] },
    limit: 1,
    depth: 1,
  })
  return res.docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, issue } = await params
  const doc = await getIssue(locale, Number(issue))
  return doc ? { title: doc.title, description: doc.summary ?? undefined } : {}
}

export default async function IssuePage({ params }: Props) {
  const { locale, issue } = await params
  const doc = Number.isInteger(Number(issue)) ? await getIssue(locale, Number(issue)) : null
  if (!doc) notFound()
  const d = t(locale)
  const glossary = await getGlossary(locale)
  const cover = typeof doc.cover === 'object' ? doc.cover : null
  return (
    <article className="wrap">
      <div className="reading">
        <Link href={`/${locale}/newsletters`} className="small">
          ← {d.newsletter.archive}
        </Link>
        <p className="label" style={{ marginTop: '1.5rem' }}>
          {d.issue} {formatNumber(doc.issue, locale)}
        </p>
        <h1>{doc.title}</h1>
        <div className="byline">
          <span>{formatDate(doc.publishAt, locale)}</span>
          <BookmarkButton
            type="n"
            id={doc.issue}
            title={doc.title}
            href={`/newsletters/${doc.issue}`}
            labels={{ save: d.saved.save, saved: d.saved.savedLabel }}
          />
        </div>
        {cover?.url ? <img src={cover.url} alt={cover.alt ?? ''} style={{ borderRadius: 10, marginBottom: '1.5rem' }} /> : null}
        {doc.summary ? <p className="prose" style={{ fontStyle: 'italic' }}>{doc.summary}</p> : null}
        <RichText value={doc.body} glossary={glossary} />
        <div className="card" style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>{d.newsletter.subscribeTitle}</h2>
          <SubscribeForm locale={locale} siteKey={turnstileSiteKey()} />
        </div>
      </div>
    </article>
  )
}
