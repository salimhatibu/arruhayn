import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FatwaList } from '@/components/site/FatwaList'
import { Pager } from '@/components/site/Pager'
import { t, type Locale } from '@/i18n/dictionary'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ page?: string }> }

async function getScholar(locale: Locale, id: number) {
  const payload = await getPayloadClient()
  return payload.findByID({ collection: 'scholars', id, locale, depth: 0, disableErrors: true })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const scholar = await getScholar(locale, Number(id))
  return scholar ? { title: scholar.name, description: scholar.bio ?? undefined } : {}
}

export default async function ScholarPage({ params, searchParams }: Props) {
  const { locale, id } = await params
  const page = Math.max(1, Number((await searchParams).page) || 1)
  const scholar = Number.isInteger(Number(id)) ? await getScholar(locale, Number(id)) : null
  if (!scholar) notFound()
  const d = t(locale)
  const payload = await getPayloadClient()
  const fatwas = await payload.find({
    collection: 'fatwas',
    locale,
    where: { and: [{ scholar: { equals: scholar.id } }, { status: { equals: 'published' } }] },
    sort: '-number',
    page,
    limit: 20,
    depth: 1,
  })
  return (
    <div className="wrap reading">
      <h1>{scholar.name}</h1>
      {scholar.bio ? (
        <div className="prose" style={{ fontSize: '1.1rem' }}>
          {scholar.bio.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : null}
      <h2>
        {d.fatwasBy} {scholar.name}
      </h2>
      <FatwaList fatwas={fatwas.docs} locale={locale} />
      <Pager
        locale={locale}
        page={fatwas.page ?? 1}
        totalPages={fatwas.totalPages}
        makeHref={(p) => `/${locale}/scholars/${scholar.id}${p > 1 ? `?page=${p}` : ''}`}
      />
    </div>
  )
}
