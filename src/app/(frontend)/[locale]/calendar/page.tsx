import type { Metadata } from 'next'
import Link from 'next/link'

import { t, type Locale } from '@/i18n/dictionary'
import { getClassesBetween, getCustomEvents } from '@/lib/calendar'
import { fastingDays, islamicDates, type CalendarEntry } from '@/lib/fasting'
import { addDays, formatHijri, HIJRI_MONTHS, isoDay, toHijri, utcDay } from '@/lib/hijri'
import { googleCalendarLink } from '@/lib/ics'
import { getMonthOverrides } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ month?: string; show?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).calendar.title }
}

const SHOW = ['classes', 'islamic', 'fasts'] as const

export default async function CalendarPage({ params, searchParams }: Props) {
  const { locale } = await params
  const sp = await searchParams
  const d = t(locale)
  const overrides = await getMonthOverrides()
  const today = utcDay(new Date())
  const [y, m] = (sp.month ?? isoDay(today).slice(0, 7)).split('-').map(Number)
  const first = new Date(Date.UTC(y || today.getUTCFullYear(), (m || today.getUTCMonth() + 1) - 1, 1))
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0))
  const gridStart = addDays(first, -first.getUTCDay())
  const gridEnd = addDays(last, 6 - last.getUTCDay())
  const show = new Set(sp.show ? sp.show.split(',') : SHOW)

  const [classes, custom] = await Promise.all([
    getClassesBetween(gridStart, addDays(gridEnd, 1), locale),
    getCustomEvents(gridStart, gridEnd, locale, overrides),
  ])
  const fasts = fastingDays(gridStart, gridEnd, overrides)
  const islamic = [...islamicDates(gridStart, gridEnd, overrides), ...custom]

  const byDay = new Map<string, { kind: string; label: string; href?: string; title: string }[]>()
  const add = (date: string, item: { kind: string; label: string; href?: string; title: string }) =>
    byDay.set(date, [...(byDay.get(date) ?? []), item])
  if (show.has('classes')) {
    for (const c of classes) {
      const time = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', { hour: 'numeric', minute: '2-digit' }).format(new Date(c.startsAt))
      add(c.startsAt.slice(0, 10), { kind: 'class', label: `${time} ${c.title}`, title: c.title, href: `/${locale}/live/${c.id}` })
    }
  }
  const label = (e: CalendarEntry) => `${e.title[locale]}${e.expected ? ` (${d.expected})` : ''}`
  if (show.has('islamic')) for (const e of islamic) add(e.date, { kind: 'islamic', label: label(e), title: label(e) })
  if (show.has('fasts')) {
    for (const e of fasts) {
      if (e.kind === 'islamic') continue
      add(e.date, { kind: e.kind, label: label(e), title: label(e) })
    }
  }

  const weeks: Date[][] = []
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)))
  }
  const monthName = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)
  const hFirst = toHijri(first, overrides)
  const hLast = toHijri(last, overrides)
  const hijriRange =
    hFirst.month === hLast.month
      ? formatHijri(hFirst, locale).replace(/^\S+\s/, '')
      : `${HIJRI_MONTHS[locale][hFirst.month - 1]} – ${formatHijri(hLast, locale).replace(/^\S+\s/, '')}`
  const monthParam = (offset: number) => {
    const target = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + offset, 1))
    const q = new URLSearchParams({ month: isoDay(target).slice(0, 7) })
    if (sp.show) q.set('show', sp.show)
    return `/${locale}/calendar?${q}`
  }
  const toggleHref = (key: string) => {
    const next = new Set(show)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    const q = new URLSearchParams({ month: isoDay(first).slice(0, 7), show: [...next].join(',') })
    return `/${locale}/calendar?${q}`
  }
  const base = process.env.PUBLIC_URL ?? 'http://localhost:3000'
  const feedUrl = (f: string) => `${base}/calendar/${f}.ics${locale === 'ar' ? '?lang=ar' : ''}`
  const webcal = (f: string) => feedUrl(f).replace(/^https?:/, 'webcal:')
  const googleSub = (f: string) => `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal(f))}`

  return (
    <div className="wrap">
      <h1>{d.calendar.title}</h1>
      <p className="muted reading">{d.calendar.intro}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', margin: '1.5rem 0 1rem' }}>
        <Link className="btn secondary small" href={monthParam(-1)} aria-label={d.calendar.prev}>
          {locale === 'ar' ? '→' : '←'}
        </Link>
        <h2 style={{ margin: 0 }}>
          {monthName} <span className="muted" style={{ fontSize: '1rem' }}>· {hijriRange}</span>
        </h2>
        <Link className="btn secondary small" href={monthParam(1)} aria-label={d.calendar.next}>
          {locale === 'ar' ? '←' : '→'}
        </Link>
        <div className="tags" style={{ marginInlineStart: 'auto' }}>
          {(
            [
              ['classes', d.calendar.classes],
              ['islamic', d.calendar.islamic],
              ['fasts', d.calendar.fasts],
            ] as const
          ).map(([key, text]) => (
            <Link key={key} className={`tag ${show.has(key) ? '' : 'lilac'}`} href={toggleHref(key)} aria-pressed={show.has(key)}>
              {show.has(key) ? '✓ ' : ''}
              {text}
            </Link>
          ))}
        </div>
      </div>

      <div className="cal-scroll">
        <table className="cal">
          <thead>
            <tr>
              {d.calendar.weekdays.map((w) => (
                <th key={w} scope="col">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={isoDay(week[0])}>
                {week.map((day) => {
                  const iso = isoDay(day)
                  const h = toHijri(day, overrides)
                  const items = byDay.get(iso) ?? []
                  const cls = [day.getUTCMonth() !== first.getUTCMonth() ? 'out' : '', iso === isoDay(today) ? 'today' : ''].join(' ')
                  return (
                    <td key={iso} className={cls}>
                      <div className="d">
                        <span>{day.getUTCDate()}</span>
                        <span className="h">{h.day === 1 ? `${h.day} ${HIJRI_MONTHS[locale][h.month - 1]}` : h.day}</span>
                      </div>
                      {items.map((it, i) =>
                        it.href ? (
                          <Link key={i} className={`e ${it.kind}`} href={it.href} title={it.title}>
                            {it.label}
                          </Link>
                        ) : (
                          <span key={i} className={`e ${it.kind}`} title={it.title}>
                            {it.label}
                          </span>
                        ),
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginTop: 0 }}>{d.calendar.feeds}</h2>
        <p className="muted">
          {d.calendar.feedsIntro} {d.calendar.reminder}
        </p>
        <ul className="list">
          {(
            [
              ['classes', d.calendar.classes],
              ['islamic-dates', d.calendar.islamic],
              ['sunnah-fasts', d.calendar.fasts],
            ] as const
          ).map(([f, text]) => (
            <li key={f} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ flex: '1 1 12rem' }}>{text}</strong>
              <a className="btn secondary small" href={googleSub(f)} target="_blank" rel="noopener noreferrer">
                {d.calendar.google}
              </a>
              <a className="btn secondary small" href={webcal(f)}>
                {d.calendar.apple}
              </a>
              <a className="btn ghost small" href={feedUrl(f)}>
                .ics
              </a>
            </li>
          ))}
        </ul>
      </section>

      {classes.filter((c) => new Date(c.startsAt) > new Date()).length ? (
        <section>
          <h2>{d.live.upcoming}</h2>
          <ul className="list">
            {classes
              .filter((c) => new Date(c.startsAt) > new Date())
              .map((c) => (
                <li key={c.id} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link className="title" style={{ flex: 1 }} href={`/${locale}/live/${c.id}`}>
                    {c.title}
                  </Link>
                  <a
                    className="btn ghost small"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={googleCalendarLink({
                      title: c.title,
                      start: c.startsAt,
                      end: new Date(new Date(c.startsAt).getTime() + c.durationMinutes * 60_000).toISOString(),
                      details: `${base}/${locale}/live/${c.id}`,
                    })}
                  >
                    {d.calendar.addToCalendar}
                  </a>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
