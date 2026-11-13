import type { Metadata } from 'next'
import Link from 'next/link'

import { t, type Locale } from '@/i18n/dictionary'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).guides.title }
}

export default async function GuidesPage({ params }: Props) {
  const { locale } = await params
  const d = t(locale)
  const payload = await getPayloadClient()
  const guides = await payload.find({
    collection: 'guides',
    locale,
    where: { status: { equals: 'published' } },
    sort: 'order',
    limit: 50,
    depth: 0,
  })
  const typeLabel = { article: d.guides.article, checklist: d.guides.checklist, path: d.guides.path }
  return (
    <div className="wrap reading">
      <h1>{d.guides.title}</h1>
      <p className="muted">{d.guides.intro}</p>
      <div className="stack" style={{ marginTop: '1.5rem' }}>
        {guides.docs.map((g) => (
          <Link key={g.id} className="card issue-card" href={`/${locale}/guides/${g.slug}`}>
            <span className="label">
              {typeLabel[g.type]} · {(g.steps ?? []).length}
            </span>
            <h3>{g.title}</h3>
            {g.summary ? <p className="muted" style={{ margin: 0 }}>{g.summary}</p> : null}
          </Link>
        ))}
      </div>
    </div>
  )
}
