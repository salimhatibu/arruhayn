'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { announceLive } from '@/components/site/LiveBannerView'
import { LocalTime } from '@/components/site/LocalTime'
import { t, type Locale } from '@/i18n/dictionary'

// Shown before a class starts. It counts down in the visitor's own time and opens the room by
// itself once the teacher starts the class, so nobody has to convert time zones or keep reloading.

const CHECK_EVERY_MS = 20_000

export function WaitForLive({ classId, startsAt, locale }: { classId: number; startsAt: string; locale: Locale }) {
  const d = t(locale).live
  const router = useRouter()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000)
    const check = setInterval(async () => {
      const res = await fetch(`/svc/live/status?id=${classId}`, { cache: 'no-store' }).catch((): null => null)
      const data = res?.ok ? ((await res.json().catch((): null => null)) as { status?: string } | null) : null
      if (data?.status && data.status !== 'scheduled') {
        router.refresh()
        announceLive()
      }
    }, CHECK_EVERY_MS)
    return () => {
      clearInterval(tick)
      clearInterval(check)
    }
  }, [classId, router])

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
    </div>
  )
}
