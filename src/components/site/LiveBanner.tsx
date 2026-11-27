import { getLiveClass } from '@/lib/payload'
import { t, type Locale } from '@/i18n/dictionary'

import { LiveBannerView } from './LiveBannerView'

// The server works out whether a class is live for the first page load. After that the banner keeps
// itself current in the browser, because the site's layout, and the banner in it, is not fetched
// again as visitors move between pages.
export async function LiveBanner({ locale }: { locale: Locale }) {
  const live = await getLiveClass(locale)
  const d = t(locale)
  return <LiveBannerView locale={locale} initial={live ? { id: live.id, title: live.title } : null} text={{ liveNow: d.liveNow, joinClass: d.joinClass }} />
}
