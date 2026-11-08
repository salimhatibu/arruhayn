import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { RichText } from '@/components/site/RichText'
import { ShareButton } from '@/components/site/ShareButton'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate } from '@/lib/format'
import { getGlossary, getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale; id: string }> }

const getItem = cache(async (locale: Locale, id: number) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'news',
    locale,
    where: { and: [{ id: { equals: id } }, { status: { equals: 'published' } }] },
    limit: 1,
    depth: 0,
  })
  return res.docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const item = await getItem(locale, Number(id))
  return item ? { title: item.title, description: item.summary ?? undefined } : {}
}

export default async function NewsItemPage({ params }: Props) {
  const { locale, id } = await params
  const item = Number.isInteger(Number(id)) ? await getItem(locale, Number(id)) : null
  if (!item) notFound()
  const d = t(locale)
  return (
    <article className="wrap reading">
      <Link href={`/${locale}/news`} className="small">
        ← {d.news.title}
      </Link>
      <h1 style={{ marginTop: '1rem' }}>{item.title}</h1>
      <div className="byline">
        <span>{formatDate(item.date, locale)}</span>
        <ShareButton title={item.title} path={`/${locale}/news/${item.id}`} locale={locale} />
      </div>
      {item.summary ? <p className="prose">{item.summary}</p> : null}
      <RichText value={item.body} glossary={await getGlossary(locale)} />
    </article>
  )
}
