import type { Locale } from '@/i18n/dictionary'

const intlLocale = (locale: Locale) => (locale === 'ar' ? 'ar-EG' : 'en-GB')

export function formatDate(value: string | Date | null | undefined, locale: Locale): string {
  if (!value) return ''
  return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(value),
  )
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale, timeZone?: string): string {
  if (!value) return ''
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(new Date(value))
}

export function formatNumber(n: number, locale: Locale): string {
  return n.toLocaleString(intlLocale(locale), { useGrouping: false })
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

export const href = (locale: Locale, path = '') => `/${locale}${path}`
