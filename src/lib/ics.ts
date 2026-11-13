// Minimal iCalendar (RFC 5545) writer for the subscribable calendar feeds.

export type IcsEvent = {
  uid: string
  title: string
  description?: string
  url?: string
  // All-day events use dates (YYYY-MM-DD); timed events use full ISO timestamps.
  start: string
  end?: string
  allDay?: boolean
  rrule?: string
  exdates?: string[]
  // Minutes before the start to remind, for example 240 for 8 pm the evening before an all-day event.
  alarmMinutesBefore?: number
}

const encoder = new TextEncoder()

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

// Lines longer than 75 bytes are folded onto continuation lines that start with a space.
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line
  const out: string[] = []
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    const limit = out.length === 0 ? 75 : 74
    if (bytes + size > limit) {
      out.push(current)
      current = ''
      bytes = 0
    }
    current += char
    bytes += size
  }
  out.push(current)
  return out.join('\r\n ')
}

const compactDate = (iso: string) => iso.slice(0, 10).replace(/-/g, '')
const compactDateTime = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

function nextDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function buildCalendar(name: string, events: IcsEvent[], now = new Date()): string {
  const stamp = compactDateTime(now.toISOString())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arruhayn//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
  ]
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stamp}`, `SUMMARY:${escapeText(e.title)}`)
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.start)}`)
      lines.push(`DTEND;VALUE=DATE:${compactDate(nextDay(e.end ?? e.start))}`)
    } else {
      lines.push(`DTSTART:${compactDateTime(e.start)}`)
      if (e.end) lines.push(`DTEND:${compactDateTime(e.end)}`)
    }
    if (e.rrule) lines.push(`RRULE:${e.rrule}`)
    if (e.exdates?.length) {
      lines.push(`EXDATE;VALUE=DATE:${e.exdates.map(compactDate).join(',')}`)
    }
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    if (e.url) lines.push(`URL:${e.url}`)
    if (e.alarmMinutesBefore !== undefined) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(e.title)}`,
        `TRIGGER:-PT${e.alarmMinutesBefore}M`,
        'END:VALARM',
      )
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

export function googleCalendarLink(e: { title: string; start: string; end?: string; allDay?: boolean; details?: string }): string {
  const dates = e.allDay
    ? `${compactDate(e.start)}/${compactDate(nextDay(e.end ?? e.start))}`
    : `${compactDateTime(e.start)}/${compactDateTime(e.end ?? e.start)}`
  const params = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates })
  if (e.details) params.set('details', e.details)
  return `https://calendar.google.com/calendar/render?${params}`
}
