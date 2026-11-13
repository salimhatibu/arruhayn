// Hijri dates from the Umm al-Qura calendar, with corrections for local moon sighting.
// All dates are handled as UTC midnight so a day never shifts with the server's time zone.

export type HijriDate = { year: number; month: number; day: number }

// A confirmed month start entered by a reviewer after the moon is sighted.
export type MonthStart = { year: number; month: number; start: string }

const DAY = 86_400_000

const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export const HIJRI_MONTHS = {
  en: [
    'Muharram',
    'Safar',
    "Rabi' al-Awwal",
    "Rabi' al-Thani",
    'Jumada al-Ula',
    'Jumada al-Akhirah',
    'Rajab',
    "Sha'ban",
    'Ramadan',
    'Shawwal',
    "Dhu al-Qa'dah",
    'Dhu al-Hijjah',
  ],
  ar: [
    'محرم',
    'صفر',
    'ربيع الأول',
    'ربيع الآخر',
    'جمادى الأولى',
    'جمادى الآخرة',
    'رجب',
    'شعبان',
    'رمضان',
    'شوال',
    'ذو القعدة',
    'ذو الحجة',
  ],
} as const

export function utcDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(`${date.slice(0, 10)}T00:00:00Z`) : date
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY)
}

export function umalqura(date: Date): HijriDate {
  const parts = formatter.formatToParts(utcDay(date))
  const get = (type: string) => Number.parseInt(parts.find((p) => p.type === type)?.value ?? '', 10)
  return { year: get('year'), month: get('month'), day: get('day') }
}

// First day of a Hijri month according to Umm al-Qura alone.
export function umalquraMonthStart(year: number, month: number): Date {
  // Rough estimate from the mean lunar month, then walk to the exact day.
  const monthsSinceEpoch = (year - 1) * 12 + (month - 1)
  let guess = addDays(new Date(Date.UTC(622, 6, 19)), Math.round(monthsSinceEpoch * 29.530588))
  for (let i = 0; i < 60; i++) {
    const h = umalqura(guess)
    const diff = (h.year - year) * 12 + (h.month - month)
    if (diff === 0) return addDays(guess, 1 - h.day)
    guess = addDays(guess, diff > 0 ? -Math.max(h.day, 1) : 30 - h.day + 1)
  }
  throw new Error(`Could not find the start of ${year}-${month}`)
}

// The day offset a confirmed month start applies, relative to Umm al-Qura. A month confirmed a day
// late also moves the day before it back into the previous month, so the window starts at the
// earlier of the two starts.
function offsetFor(date: Date, overrides: MonthStart[]): number {
  let best: { start: Date; offset: number } | undefined
  for (const o of overrides) {
    const start = utcDay(o.start)
    const calculated = umalquraMonthStart(o.year, o.month)
    const windowStart = start < calculated ? start : calculated
    if (date < windowStart || date >= addDays(start, 30)) continue
    if (!best || start > best.start) {
      best = { start, offset: (start.getTime() - calculated.getTime()) / DAY }
    }
  }
  return best?.offset ?? 0
}

export function toHijri(date: Date, overrides: MonthStart[] = []): HijriDate {
  const day = utcDay(date)
  return umalqura(addDays(day, -offsetFor(day, overrides)))
}

export function toGregorian(h: HijriDate, overrides: MonthStart[] = []): Date {
  const confirmed = overrides.find((o) => o.year === h.year && o.month === h.month)
  const start = confirmed ? utcDay(confirmed.start) : umalquraMonthStart(h.year, h.month)
  return addDays(start, h.day - 1)
}

export function isConfirmed(h: HijriDate, overrides: MonthStart[]): boolean {
  return overrides.some((o) => o.year === h.year && o.month === h.month)
}

export function formatHijri(h: HijriDate, locale: 'en' | 'ar'): string {
  const month = HIJRI_MONTHS[locale][h.month - 1]
  if (locale === 'ar') {
    const n = (v: number) => v.toLocaleString('ar-EG', { useGrouping: false })
    return `${n(h.day)} ${month} ${n(h.year)} هـ`
  }
  return `${h.day} ${month} ${h.year} AH`
}

export function formatGregorian(date: Date, locale: 'en' | 'ar'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
