import { fastingDays, islamicDates, mondayThursdayExceptions, type CalendarEntry } from './fasting'
import { addDays, isoDay, toGregorian, toHijri, utcDay, type MonthStart } from './hijri'
import { buildCalendar, type IcsEvent } from './ics'
import { getPayloadClient } from './payload'

// Builds the three calendar feeds and the calendar page from the same data.

export type Feed = 'classes' | 'islamic-dates' | 'sunnah-fasts'
export const FEEDS: Feed[] = ['classes', 'islamic-dates', 'sunnah-fasts']
type Locale = 'en' | 'ar'

export type ClassEntry = { id: number; title: string; startsAt: string; durationMinutes: number }

export async function getClassesBetween(start: Date, end: Date, locale: Locale): Promise<ClassEntry[]> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'classes',
    locale,
    where: {
      and: [
        { startsAt: { greater_than_equal: start.toISOString() } },
        { startsAt: { less_than: end.toISOString() } },
        { status: { not_equals: 'cancelled' } },
      ],
    },
    sort: 'startsAt',
    limit: 500,
    pagination: false,
    depth: 0,
  })
  return res.docs.map((c) => ({ id: c.id, title: c.title, startsAt: c.startsAt, durationMinutes: c.durationMinutes ?? 90 }))
}

// Custom events from the admin, expanded into dated entries.
export async function getCustomEvents(start: Date, end: Date, locale: Locale, overrides: MonthStart[]): Promise<CalendarEntry[]> {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'events', locale, limit: 500, pagination: false, depth: 0 })
  const out: CalendarEntry[] = []
  for (const e of res.docs) {
    if (e.dateType === 'gregorian' && e.gregorianDate) {
      const d = utcDay(e.gregorianDate)
      if (d >= start && d <= end) {
        out.push({ key: `event-${e.id}`, date: isoDay(d), kind: 'islamic', title: { en: e.title, ar: e.title }, expected: false, hijriYear: toHijri(d, overrides).year })
      }
    } else if (e.dateType === 'hijri' && e.hijriMonth && e.hijriDay) {
      const first = toHijri(start, overrides).year
      for (const year of [first, first + 1]) {
        const d = toGregorian({ year, month: Number(e.hijriMonth), day: e.hijriDay }, overrides)
        if (d >= start && d <= end) {
          out.push({ key: `event-${e.id}-${year}`, date: isoDay(d), kind: 'islamic', title: { en: e.title, ar: e.title }, expected: true, hijriYear: year })
        }
      }
    }
  }
  return out
}

function entryToEvent(e: CalendarEntry, locale: Locale, base: string, alarm: boolean): IcsEvent {
  const title = e.expected ? `${e.title[locale]} (${locale === 'ar' ? 'متوقع' : 'expected'})` : e.title[locale]
  return {
    uid: `${e.key}@arruhayn`,
    title,
    start: e.date,
    end: e.endDate,
    allDay: true,
    url: `${base}/${locale}/calendar`,
    alarmMinutesBefore: alarm && !e.endDate ? 240 : undefined,
  }
}

export async function buildFeed(feed: Feed, locale: Locale, base: string, overrides: MonthStart[]): Promise<string> {
  const start = utcDay(new Date())
  const end = addDays(start, 365)
  const names = {
    classes: { en: 'Arruhayn classes', ar: 'دروس الرُّحَين' },
    'islamic-dates': { en: 'Arruhayn Islamic dates', ar: 'المناسبات الشرعية - الرُّحَين' },
    'sunnah-fasts': { en: 'Arruhayn Sunnah fasts', ar: 'صيام التطوع - الرُّحَين' },
  }

  let events: IcsEvent[] = []
  if (feed === 'classes') {
    const classes = await getClassesBetween(addDays(start, -30), end, locale)
    events = classes.map((c) => ({
      uid: `class-${c.id}@arruhayn`,
      title: c.title,
      start: c.startsAt,
      end: new Date(new Date(c.startsAt).getTime() + c.durationMinutes * 60_000).toISOString(),
      url: `${base}/${locale}/live/${c.id}`,
      alarmMinutesBefore: 30,
    }))
  } else if (feed === 'islamic-dates') {
    const custom = await getCustomEvents(start, end, locale, overrides)
    events = [...islamicDates(start, end, overrides), ...custom].map((e) => entryToEvent(e, locale, base, false))
  } else {
    // Mondays and Thursdays repeat weekly; Ramadan and days when fasting isn't allowed are excluded.
    const firstMonThu = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i)).find((d) => d.getUTCDay() === 1 || d.getUTCDay() === 4)!
    const until = isoDay(end).replace(/-/g, '')
    events.push({
      uid: `mon-thu-${isoDay(start)}@arruhayn`,
      title: locale === 'ar' ? 'صيام الاثنين والخميس' : 'Monday and Thursday fast',
      start: isoDay(firstMonThu),
      allDay: true,
      rrule: `FREQ=WEEKLY;BYDAY=MO,TH;UNTIL=${until}`,
      exdates: mondayThursdayExceptions(start, end, overrides),
      url: `${base}/${locale}/calendar`,
      alarmMinutesBefore: 240,
    })
    const fasts = fastingDays(start, end, overrides).filter((e) => !e.key.startsWith('mon-thu'))
    events.push(...fasts.map((e) => entryToEvent(e, locale, base, e.kind === 'sunnah' || e.kind === 'highlight')))
  }
  return buildCalendar(names[feed][locale], events)
}
