import type { Metadata } from 'next'
import Link from 'next/link'

import { Pager } from '@/components/site/Pager'
import { SubscribeForm } from '@/components/site/SubscribeForm'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatNumber } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'
import { turnstileSiteKey } from '@/lib/turnstile'

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ page?: string; status?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).newsletter.title }
}

export default async function NewslettersPage({ params, searchParams }: Props) {
  const { locale } = await params
  const sp = await searchParams
  const d = t(locale)
  const page = Math.max(1, Number(sp.page) || 1)
  const payload = await getPayloadClient()
  const issues = await payload.find({
    collection: 'newsletters',
    locale,
    where: { status: { equals: 'published' } },
    sort: '-issue',
    limit: 12,
    page,
    depth: 1,
  })
  const notice =
    sp.status === 'confirmed' ? d.newsletter.confirmed : sp.status === 'unsubscribed' ? d.newsletter.unsubscribed : null

  // Group issues by month for the archive.
  const groups = new Map<string, typeof issues.docs>()
  for (const issue of issues.docs) {
    const date = issue.publishAt ?? issue.createdAt
    const key = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', { month: 'long', year: 'numeric' }).format(new Date(date))
    groups.set(key, [...(groups.get(key) ?? []), issue])
  }

  return (
    <div className="wrap">
      <h1>{d.newsletter.title}</h1>
      <p className="muted reading">{d.newsletter.intro}</p>
      {notice ? (
        <p className="notice" role="status">
          {notice}
        </p>
      ) : null}
      <div className="layout-side" style={{ marginTop: '1.5rem' }}>
        <div>
          {issues.docs.length ? (
            [...groups.entries()].map(([month, docs]) => (
              <section key={month}>
                <h2 style={{ fontSize: '1.2rem' }}>{month}</h2>
                <div className="stack">
                  {docs.map((n) => (
                    <Link key={n.id} className="card issue-card" href={`/${locale}/newsletters/${n.issue}`}>
                      <span className="label">
                        {d.issue} {formatNumber(n.issue, locale)} · {formatDate(n.publishAt, locale)}
                      </span>
                      <h3>{n.title}</h3>
                      {n.summary ? <p className="muted" style={{ margin: 0 }}>{n.summary}</p> : null}
                    </Link>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <p className="muted">{d.newsletter.none}</p>
          )}
          <Pager
            locale={locale}
            page={issues.page ?? 1}
            totalPages={issues.totalPages}
            makeHref={(p) => `/${locale}/newsletters${p > 1 ? `?page=${p}` : ''}`}
          />
        </div>
        <aside>
          <div className="card">
            <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>{d.newsletter.subscribeTitle}</h2>
            <p className="muted small">{d.newsletter.subscribeBody}</p>
            <SubscribeForm locale={locale} siteKey={turnstileSiteKey()} />
          </div>
        </aside>
      </div>
    </div>
  )
}
