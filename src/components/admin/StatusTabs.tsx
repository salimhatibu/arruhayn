import Link from 'next/link'
import type { BeforeListTableServerProps, Where } from 'payload'

// Tabs above a list: All, then one per status with how many documents are in it, and an export
// button that downloads what the current tab shows as CSV.
export async function StatusTabs({ collectionConfig, collectionSlug, payload, user, searchParams }: BeforeListTableServerProps) {
  const statusField = collectionConfig.fields.find(
    (f): f is Extract<typeof f, { name: string; type: 'select' }> => 'name' in f && f.name === 'status' && f.type === 'select',
  )
  const options = (statusField?.options ?? []).map((o) => (typeof o === 'string' ? { label: o, value: o } : { label: String(o.label), value: o.value }))

  // The filter arrives either parsed (where.status.equals) or as the raw query key.
  const where = (searchParams?.where ?? {}) as { status?: { equals?: string } }
  const raw = searchParams?.['where[status][equals]']
  const active = where.status?.equals ?? (typeof raw === 'string' ? raw : undefined)
  const keep = new URLSearchParams()
  for (const key of ['limit', 'sort', 'search']) {
    const v = searchParams?.[key]
    if (typeof v === 'string') keep.set(key, v)
  }
  const href = (value?: string) => {
    const q = new URLSearchParams(keep)
    if (value) q.set('where[status][equals]', value)
    const s = q.toString()
    return `/admin/collections/${collectionSlug}${s ? `?${s}` : ''}`
  }
  const count = async (w?: Where) =>
    (await payload.count({ collection: collectionSlug as never, where: w, user, overrideAccess: false }).catch(() => ({ totalDocs: 0 }))).totalDocs
  const [all, ...each] = await Promise.all([count(), ...options.map((o) => count({ status: { equals: o.value } }))])

  const exportQuery = new URLSearchParams({ collection: collectionSlug })
  if (active) exportQuery.set('status', active)

  return (
    <div className="status-tabs">
      <nav className="status-tabs__list" aria-label="Filter by status">
        <Link className="status-tab" href={href()} aria-current={!active ? 'page' : undefined}>
          All <span className="status-tab__count">{all}</span>
        </Link>
        {options.map((o, i) => (
          <Link key={o.value} className={`status-tab status-tab--${o.value}`} href={href(o.value)} aria-current={active === o.value ? 'page' : undefined}>
            {o.label} <span className="status-tab__count">{each[i]}</span>
          </Link>
        ))}
      </nav>
      {collectionSlug === 'users' ? null : (
        <a className="status-tabs__export" href={`/svc/staff/export?${exportQuery}`} download>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" />
        </svg>
        Export CSV
        </a>
      )}
    </div>
  )
}
