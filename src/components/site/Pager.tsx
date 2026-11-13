import Link from 'next/link'

import { t, type Locale } from '@/i18n/dictionary'
import { formatNumber } from '@/lib/format'

export function Pager({
  locale,
  page,
  totalPages,
  makeHref,
}: {
  locale: Locale
  page: number
  totalPages: number
  makeHref: (page: number) => string
}) {
  if (totalPages <= 1) return null
  const d = t(locale)
  return (
    <nav className="pager" aria-label={d.page}>
      {page > 1 ? (
        <Link className="btn secondary small" href={makeHref(page - 1)} rel="prev">
          {d.previous}
        </Link>
      ) : (
        <span />
      )}
      <span className="muted small">
        {d.page} {formatNumber(page, locale)} {d.of} {formatNumber(totalPages, locale)}
      </span>
      {page < totalPages ? (
        <Link className="btn secondary small" href={makeHref(page + 1)} rel="next">
          {d.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
