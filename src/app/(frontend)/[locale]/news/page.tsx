import type { Metadata } from 'next'
import Link from 'next/link'

import { Pager } from '@/components/site/Pager'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).news.title }
}

export default async function NewsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const page = Math.max(1, Number((await searchParams).page) || 1)
  const d = t(locale)
  const payload = await getPayloadClient()
  const news = await payload.find({
    collection: 'news',
    locale,
    where: { status: { equals: 'published' } },
    sort: '-date',
    limit: 20,
    page,
    depth: 0,
  })
  return (
    <div className="wrap reading">
      <h1>{d.news.title}</h1>
      {news.docs.length ? (
        <ul className="list">
          {news.docs.map((n) => (
            <li key={n.id}>
              <Link className="title" href={`/${locale}/news/${n.id}`}>
                {n.title}
              </Link>
              <div className="meta">{formatDate(n.date, locale)}</div>
              {n.summary ? <p className="muted" style={{ margin: '0.3rem 0 0' }}>{n.summary}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{d.news.none}</p>
      )}
      <Pager locale={locale} page={news.page ?? 1} totalPages={news.totalPages} makeHref={(p) => `/${locale}/news${p > 1 ? `?page=${p}` : ''}`} />
    </div>
  )
}
