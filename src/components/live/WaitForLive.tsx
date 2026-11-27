'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { announceLive } from '@/components/site/LiveBannerView'
import { LocalTime } from '@/components/site/LocalTime'
import { t, type Locale } from '@/i18n/dictionary'
import { googleCalendarLink } from '@/lib/ics'

// Shown before a class starts. It counts down in the visitor's own time and opens the room by
// itself once the teacher starts the class, so nobody has to convert time zones or keep reloading.

const CHECK_EVERY_MS = 20_000
const noop = () => () => {}

export function WaitForLive({
  classId,
  startsAt,
  locale,
  title,
  durationMinutes,
  pageUrl,
}: {
  classId: number
  startsAt: string
  locale: Locale
  title: string
  durationMinutes: number
  pageUrl: string
}) {
  const d = t(locale).live
  const router = useRouter()
  const [now, setNow] = useState<number | null>(null)
  // Notifications: whether this browser has them, and the answer if the visitor was asked this visit.
  const canNotify = useSyncExternalStore(noop, () => 'Notification' in window, () => false)
  const [asked, setAsked] = useState<NotificationPermission | null>(null)
  const permission = asked ?? (canNotify ? Notification.permission : 'default')

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000)
    const check = setInterval(async () => {
      const res = await fetch(`/svc/live/status?id=${classId}`, { cache: 'no-store' }).catch((): null => null)
      const data = res?.ok ? ((await res.json().catch((): null => null)) as { status?: string } | null) : null
      if (data?.status && data.status !== 'scheduled') {
        // A visitor looking at another tab is told; one looking at this page sees it open.
        if (data.status === 'live' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
          const note = new Notification(d.startedTitle(title), { body: d.startedBody, tag: `arruhayn-class-${classId}` })
          note.onclick = () => {
            window.focus()
            note.close()
          }
        }
        router.refresh()
        announceLive()
      }
    }, CHECK_EVERY_MS)
    return () => {
      clearInterval(tick)
      clearInterval(check)
    }
  }, [classId, router, title, d])

  const minutesLeft = now === null ? null : Math.ceil((new Date(startsAt).getTime() - now) / 60_000)

  return (
    <div className="notice wait-for-live" role="status">
      <p style={{ margin: 0 }}>
        {d.notLive} <LocalTime value={startsAt} locale={locale} />.
      </p>
      {minutesLeft !== null ? (
        <p style={{ margin: '0.4rem 0 0' }}>
          <strong>{minutesLeft > 0 ? d.startsIn(d.countdown(minutesLeft)) : d.startingSoon}</strong> {d.opensItself}
        </p>
      ) : null}
      <div className="wait-actions">
        <span className="small">{d.addToCalendar}:</span>
        <a
          className="btn ghost small"
          target="_blank"
          rel="noopener noreferrer"
          href={googleCalendarLink({
            title,
            start: startsAt,
            end: new Date(new Date(startsAt).getTime() + durationMinutes * 60_000).toISOString(),
            details: pageUrl,
          })}
        >
          {d.googleCalendar}
        </a>
        <a className="btn ghost small" href={`/${locale}/live/${classId}/calendar.ics`}>
          {d.otherCalendar}
        </a>
        {canNotify && permission === 'default' ? (
          <button className="btn ghost small" type="button" onClick={() => Notification.requestPermission().then(setAsked)}>
            {d.notifyMe}
          </button>
        ) : null}
      </div>
      {permission === 'granted' && canNotify ? <p className="small" style={{ margin: '0.4rem 0 0' }}>{d.notifyOn}</p> : null}
      {asked === 'denied' ? <p className="small" style={{ margin: '0.4rem 0 0' }}>{d.notifyBlocked}</p> : null}
    </div>
  )
}
