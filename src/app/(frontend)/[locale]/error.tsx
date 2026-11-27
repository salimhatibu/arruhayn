'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { isLocale, t } from '@/i18n/dictionary'

// Shown in place of a page that failed while loading, inside the site and in the visitor's language,
// instead of a bare error screen.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ locale?: string }>()
  const locale = params?.locale && isLocale(params.locale) ? params.locale : 'en'
  const d = t(locale)
  return (
    <div className="wrap reading" role="alert" style={{ paddingBlock: 'clamp(2rem, 6vw, 4rem)' }}>
      <h1>{d.errorTitle}</h1>
      <p>{d.errorBody}</p>
      <div className="controls">
        <button className="btn" onClick={reset}>
          {d.tryAgain}
        </button>
        <Link className="btn ghost" href={`/${locale}`}>
          {d.goHome}
        </Link>
      </div>
    </div>
  )
}
