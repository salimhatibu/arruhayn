import Link from 'next/link'

import type { Fatwa } from '@/payload-types'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatNumber } from '@/lib/format'

export function FatwaList({ fatwas, locale }: { fatwas: Fatwa[]; locale: Locale }) {
  const d = t(locale)
  if (!fatwas.length) return <p className="muted">{d.noFatwas}</p>
  return (
    <ul className="list">
      {fatwas.map((f) => (
        <li key={f.id}>
          <Link className="title" href={`/${locale}/fatwas/${f.number}`}>
            {f.title}
          </Link>
          <div className="meta">
            <span>
              {d.fatwaNumber} {formatNumber(f.number ?? 0, locale)}
            </span>
            {f.publishedAt ? <span>{formatDate(f.publishedAt, locale)}</span> : null}
            {(f.topics ?? []).map((tp) =>
              typeof tp === 'object' ? (
                <Link key={tp.id} href={`/${locale}/topics/${tp.slug}`}>
                  {tp.name}
                </Link>
              ) : null,
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
