import Link from 'next/link'

import { getLiveClass } from '@/lib/payload'
import { t, type Locale } from '@/i18n/dictionary'

export async function LiveBanner({ locale }: { locale: Locale }) {
  const live = await getLiveClass(locale)
  if (!live) return null
  const d = t(locale)
  return (
    <div className="live-banner" role="status">
      <div className="wrap">
        <span className="live-dot" aria-hidden="true" />
        <span>
          <strong>{d.liveNow}:</strong> {live.title}
        </span>
        <Link href={`/${locale}/live/${live.id}`}>{d.joinClass} →</Link>
      </div>
    </div>
  )
}
