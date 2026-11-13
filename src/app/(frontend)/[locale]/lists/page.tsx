import type { Metadata } from 'next'

import { SharedList } from '@/components/site/SharedList'
import { t, type Locale } from '@/i18n/dictionary'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ items?: string; name?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).saved.sharedList, robots: { index: false } }
}

// A reading list shared as a link. The link holds only item IDs, such as f-12 for fatwa 12.
export default async function SharedListPage({ params, searchParams }: Props) {
  const { locale } = await params
  const sp = await searchParams
  const d = t(locale)
  const ids = (sp.items ?? '').split(',').filter((x) => /^[fngr]-[\w-]{1,80}$/.test(x)).slice(0, 100)
  const by = (prefix: string) => ids.filter((i) => i.startsWith(`${prefix}-`)).map((i) => i.slice(2))
  const payload = await getPayloadClient()
  const published = { status: { equals: 'published' } }
  const [fatwas, issues, guides, recordings] = await Promise.all([
    by('f').length ? payload.find({ collection: 'fatwas', locale, where: { and: [{ number: { in: by('f').map(Number) } }, published] }, limit: 100, depth: 0 }) : null,
    by('n').length ? payload.find({ collection: 'newsletters', locale, where: { and: [{ issue: { in: by('n').map(Number) } }, published] }, limit: 100, depth: 0 }) : null,
    by('g').length ? payload.find({ collection: 'guides', locale, where: { and: [{ slug: { in: by('g') } }, published] }, limit: 100, depth: 0 }) : null,
    by('r').length ? payload.find({ collection: 'recordings', locale, where: { and: [{ id: { in: by('r').map(Number) } }, published] }, limit: 100, depth: 0 }) : null,
  ])
  const lookup = new Map<string, { title: string; href: string }>()
  fatwas?.docs.forEach((f) => lookup.set(`f-${f.number}`, { title: f.title, href: `/fatwas/${f.number}` }))
  issues?.docs.forEach((n) => lookup.set(`n-${n.issue}`, { title: n.title, href: `/newsletters/${n.issue}` }))
  guides?.docs.forEach((g) => lookup.set(`g-${g.slug}`, { title: g.title, href: `/guides/${g.slug}` }))
  recordings?.docs.forEach((r) => lookup.set(`r-${r.id}`, { title: r.title, href: `/library/${r.id}` }))
  const items = ids.flatMap((id) => {
    const found = lookup.get(id)
    return found ? [{ id, type: id[0] as 'f' | 'n' | 'g' | 'r', ...found }] : []
  })
  const name = (sp.name ?? '').slice(0, 60) || d.saved.sharedList

  return (
    <div className="wrap reading">
      <p className="label">{d.saved.sharedList}</p>
      <h1>{name}</h1>
      <SharedList locale={locale} name={name} items={items} />
    </div>
  )
}
