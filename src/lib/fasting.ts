// Sunnah fasting days and Islamic dates, worked out from the Hijri calendar.
// The rules and wording here must be approved by a reviewer before launch.
import { addDays, isConfirmed, isoDay, toHijri, utcDay, type MonthStart } from './hijri'

export type Bilingual = { en: string; ar: string }

export type CalendarEntry = {
  key: string
  date: string
  // Last day for entries that span a period, such as the six days of Shawwal.
  endDate?: string
  kind: 'sunnah' | 'highlight' | 'forbidden' | 'islamic'
  title: Bilingual
  // True near the start or end of a month that hasn't been confirmed by moon sighting yet.
  expected: boolean
  hijriYear: number
}

const RAMADAN = 9
const SHAWWAL = 10
const DHUL_HIJJAH = 12
const MUHARRAM = 1
const SHABAN = 8

const T = {
  monThu: { en: 'Monday and Thursday fast', ar: 'صيام الاثنين والخميس' },
  white: { en: 'White days fast', ar: 'صيام الأيام البيض' },
  dhulHijjah: { en: 'First nine days of Dhul Hijjah', ar: 'صيام العشر من ذي الحجة' },
  arafah: { en: 'Day of Arafah', ar: 'يوم عرفة' },
  tasua: { en: "Tasu'a (9 Muharram)", ar: 'تاسوعاء' },
  ashura: { en: 'Day of Ashura', ar: 'يوم عاشوراء' },
  shawwal: { en: 'Six days of Shawwal', ar: 'ست من شوال' },
  muharram: { en: 'Month of Muharram: the best month to fast after Ramadan', ar: 'شهر الله المحرم: أفضل الصيام بعد رمضان' },
  shaban: { en: "Month of Sha'ban: the Prophet ﷺ fasted most of it", ar: 'شهر شعبان: كان النبي ﷺ يصوم أكثره' },
  ramadan: { en: 'Ramadan begins', ar: 'بداية شهر رمضان' },
  lastTen: { en: 'Last ten nights of Ramadan begin', ar: 'بداية العشر الأواخر من رمضان' },
  eidFitr: { en: 'Eid al-Fitr (no fasting)', ar: 'عيد الفطر (لا صيام)' },
  eidAdha: { en: 'Eid al-Adha (no fasting)', ar: 'عيد الأضحى (لا صيام)' },
  tashreeq: { en: 'Day of tashreeq (no fasting)', ar: 'من أيام التشريق (لا صيام)' },
  newYear: { en: 'Islamic new year', ar: 'رأس السنة الهجرية' },
} satisfies Record<string, Bilingual>

export function isForbiddenFast(month: number, day: number): boolean {
  return (month === SHAWWAL && day === 1) || (month === DHUL_HIJJAH && day >= 10 && day <= 13)
}

function eachDay(start: Date, end: Date, fn: (date: Date) => void) {
  for (let d = utcDay(start); d <= end; d = addDays(d, 1)) fn(d)
}

// Last day of the Hijri month that `date` falls in.
function monthEnd(date: Date, overrides: MonthStart[]): Date {
  const month = toHijri(date, overrides).month
  let d = date
  while (toHijri(addDays(d, 1), overrides).month === month) d = addDays(d, 1)
  return d
}

export function fastingDays(start: Date, end: Date, overrides: MonthStart[] = []): CalendarEntry[] {
  const out: CalendarEntry[] = []
  eachDay(start, utcDay(end), (date) => {
    const h = toHijri(date, overrides)
    const expected = !isConfirmed(h, overrides) && (h.day <= 2 || h.day >= 29)
    const add = (key: string, kind: CalendarEntry['kind'], title: Bilingual, endDate?: Date) =>
      out.push({
        key: `${key}-${h.year}-${h.month}-${h.day}`,
        date: isoDay(date),
        endDate: endDate ? isoDay(endDate) : undefined,
        kind,
        title,
        expected,
        hijriYear: h.year,
      })

    if (h.month === SHAWWAL && h.day === 1) return add('eid-fitr', 'forbidden', T.eidFitr)
    if (h.month === DHUL_HIJJAH && h.day === 10) return add('eid-adha', 'forbidden', T.eidAdha)
    if (h.month === DHUL_HIJJAH && h.day >= 11 && h.day <= 13) {
      return add('tashreeq', 'forbidden', T.tashreeq)
    }

    if (h.month === RAMADAN) {
      if (h.day === 1) add('ramadan', 'islamic', T.ramadan)
      if (h.day === 21) add('last-ten', 'islamic', T.lastTen)
      return
    }

    if (h.month === DHUL_HIJJAH && h.day === 9) add('arafah', 'highlight', T.arafah)
    else if (h.month === DHUL_HIJJAH && h.day <= 8) add('dhul-hijjah', 'sunnah', T.dhulHijjah)

    if (h.month === MUHARRAM && h.day === 9) add('tasua', 'highlight', T.tasua)
    if (h.month === MUHARRAM && h.day === 10) add('ashura', 'highlight', T.ashura)
    if (h.month === MUHARRAM && h.day === 1) {
      add('muharram', 'sunnah', T.muharram, monthEnd(date, overrides))
    }
    if (h.month === SHABAN && h.day === 1) add('shaban', 'sunnah', T.shaban, monthEnd(date, overrides))
    if (h.month === SHAWWAL && h.day === 2) add('shawwal', 'sunnah', T.shawwal, monthEnd(date, overrides))

    if (h.day >= 13 && h.day <= 15) add('white', 'sunnah', T.white)

    const weekday = date.getUTCDay()
    if (weekday === 1 || weekday === 4) add('mon-thu', 'sunnah', T.monThu)
  })
  return out
}

// Mondays and Thursdays when the weekly fast is not shown: Ramadan and the days when fasting
// is not allowed. Used for EXDATE in the calendar feed.
export function mondayThursdayExceptions(
  start: Date,
  end: Date,
  overrides: MonthStart[] = [],
): string[] {
  const out: string[] = []
  eachDay(start, utcDay(end), (date) => {
    const weekday = date.getUTCDay()
    if (weekday !== 1 && weekday !== 4) return
    const h = toHijri(date, overrides)
    if (h.month === RAMADAN || isForbiddenFast(h.month, h.day)) out.push(isoDay(date))
  })
  return out
}

export function islamicDates(start: Date, end: Date, overrides: MonthStart[] = []): CalendarEntry[] {
  const out: CalendarEntry[] = []
  eachDay(start, utcDay(end), (date) => {
    const h = toHijri(date, overrides)
    const expected = !isConfirmed(h, overrides) && (h.day <= 2 || h.day >= 29)
    const add = (key: string, title: Bilingual) =>
      out.push({
        key: `${key}-${h.year}`,
        date: isoDay(date),
        kind: 'islamic',
        title,
        expected,
        hijriYear: h.year,
      })
    if (h.month === MUHARRAM && h.day === 1) add('new-year', T.newYear)
    if (h.month === MUHARRAM && h.day === 10) add('ashura', T.ashura)
    if (h.month === RAMADAN && h.day === 1) add('ramadan', T.ramadan)
    if (h.month === RAMADAN && h.day === 21) add('last-ten', T.lastTen)
    if (h.month === SHAWWAL && h.day === 1) add('eid-fitr', { en: 'Eid al-Fitr', ar: 'عيد الفطر' })
    if (h.month === DHUL_HIJJAH && h.day === 9) add('arafah', T.arafah)
    if (h.month === DHUL_HIJJAH && h.day === 10) add('eid-adha', { en: 'Eid al-Adha', ar: 'عيد الأضحى' })
  })
  return out
}

// What to show in the date strip: a fast today, or one tomorrow.
export function fastNotice(today: Date, overrides: MonthStart[] = []) {
  const entries = fastingDays(today, addDays(today, 1), overrides).filter(
    (e) => e.kind === 'sunnah' || e.kind === 'highlight',
  )
  const todayIso = isoDay(utcDay(today))
  const todays = entries.filter((e) => e.date === todayIso && !e.endDate)
  if (todays.length) return { when: 'today' as const, entry: todays[0] }
  const tomorrows = entries.filter((e) => e.date !== todayIso && !e.endDate)
  if (tomorrows.length) return { when: 'tomorrow' as const, entry: tomorrows[0] }
  return null
}
