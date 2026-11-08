import { fastNotice } from '@/lib/fasting'
import { formatGregorian, formatHijri, toHijri, utcDay } from '@/lib/hijri'
import { getMonthOverrides } from '@/lib/payload'
import { t, type Locale } from '@/i18n/dictionary'

export async function DateStrip({ locale }: { locale: Locale }) {
  const d = t(locale)
  const overrides = await getMonthOverrides()
  const today = utcDay(new Date())
  const hijri = toHijri(today, overrides)
  const fast = fastNotice(today, overrides)
  return (
    <div className="date-strip">
      <div className="wrap">
        <span>
          <strong>{formatHijri(hijri, locale)}</strong>
        </span>
        <span>{formatGregorian(today, locale)}</span>
        {fast ? (
          <a className="fast-chip" href={`/${locale}/calendar`}>
            {fast.when === 'today' ? d.fastToday : d.fastTomorrow}: {fast.entry.title[locale]}
            {fast.entry.expected ? ` (${d.expected})` : ''}
          </a>
        ) : null}
      </div>
    </div>
  )
}
