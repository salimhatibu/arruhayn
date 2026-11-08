import { describe, expect, it } from 'vitest'

import { buildMatchQuery, normalize } from '@/lib/arabic'
import { fastingDays, islamicDates, mondayThursdayExceptions } from '@/lib/fasting'
import { addDays, isoDay, toGregorian, toHijri, umalqura, umalquraMonthStart, utcDay } from '@/lib/hijri'
import { buildCalendar, foldLine } from '@/lib/ics'

describe('hijri', () => {
  it('matches the Umm al-Qura start of 1447', () => {
    expect(isoDay(umalquraMonthStart(1447, 1))).toBe('2025-06-26')
    expect(umalqura(utcDay('2025-06-26'))).toEqual({ year: 1447, month: 1, day: 1 })
  })

  it('round-trips every day of a year', () => {
    let d = utcDay('2026-01-01')
    for (let i = 0; i < 400; i++) {
      const h = toHijri(d)
      expect(isoDay(toGregorian(h))).toBe(isoDay(d))
      d = addDays(d, 1)
    }
  })

  it('applies a confirmed month start', () => {
    const start = umalquraMonthStart(1448, 9)
    const sighted = addDays(start, 1)
    const overrides = [{ year: 1448, month: 9, start: isoDay(sighted) }]
    expect(toHijri(start, overrides).month).toBe(8)
    expect(toHijri(sighted, overrides)).toEqual({ year: 1448, month: 9, day: 1 })
    expect(isoDay(toGregorian({ year: 1448, month: 9, day: 1 }, overrides))).toBe(isoDay(sighted))
  })
})

describe('fasting', () => {
  const start = utcDay('2026-11-01')
  const end = addDays(start, 365)
  const entries = fastingDays(start, end)

  it('puts Arafah on 9 Dhul Hijjah and Ashura on 10 Muharram', () => {
    const arafah = entries.find((e) => e.key.startsWith('arafah'))!
    expect(toHijri(utcDay(arafah.date))).toMatchObject({ month: 12, day: 9 })
    const ashura = entries.find((e) => e.key.startsWith('ashura'))!
    expect(toHijri(utcDay(ashura.date))).toMatchObject({ month: 1, day: 10 })
  })

  it('never shows a fast on Eid, tashreeq, or in Ramadan', () => {
    for (const e of entries.filter((x) => x.kind === 'sunnah' || x.kind === 'highlight')) {
      const h = toHijri(utcDay(e.date))
      expect(h.month).not.toBe(9)
      expect(h.month === 10 && h.day === 1).toBe(false)
      expect(h.month === 12 && h.day >= 10 && h.day <= 13).toBe(false)
    }
  })

  it('leaves out 13 Dhul Hijjah from the white days', () => {
    const white = entries.filter((e) => e.key.startsWith('white'))
    expect(white.some((e) => e.key.endsWith('-12-13'))).toBe(false)
  })

  it('lists Ramadan Mondays and Thursdays as exceptions', () => {
    const ex = mondayThursdayExceptions(start, end)
    expect(ex.length).toBeGreaterThan(5)
    for (const d of ex) expect([1, 4]).toContain(utcDay(d).getUTCDay())
  })

  it('marks the main Islamic dates once each', () => {
    const dates = islamicDates(start, end)
    expect(dates.filter((d) => d.key.startsWith('eid-fitr'))).toHaveLength(1)
    expect(dates.filter((d) => d.key.startsWith('eid-adha'))).toHaveLength(1)
  })
})

describe('arabic search', () => {
  it('ignores diacritics and letter variants', () => {
    expect(normalize('زَوَاج')).toBe(normalize('زواج'))
    expect(normalize('إمرأة')).toBe(normalize('امراه'))
  })

  it('expands synonyms', () => {
    const q = buildMatchQuery('dowry late', new Map([['dowry', ['mahr', 'bride gift']]]))
    expect(q).toBe('("dowry"* OR "mahr"* OR "bride gift") AND "late"*')
  })
})

describe('ics', () => {
  it('folds long lines at 75 bytes', () => {
    const folded = foldLine('SUMMARY:' + 'ع'.repeat(60))
    for (const line of folded.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })

  it('writes all-day events with an exclusive end date', () => {
    const ics = buildCalendar('Test', [{ uid: 'a@x', title: 'Fast', start: '2026-11-09', allDay: true }])
    expect(ics).toContain('DTSTART;VALUE=DATE:20261109')
    expect(ics).toContain('DTEND;VALUE=DATE:20261110')
  })
})
