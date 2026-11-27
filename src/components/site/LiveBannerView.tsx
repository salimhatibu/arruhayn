'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { Locale } from '@/i18n/dictionary'

type Live = { id: number; title: string } | null

// Pages announce that a class has started or ended with this event, so the banner changes at once.
// A page that knows which class ended says so in `detail.ended`, and the banner drops it straight
// away instead of waiting for the server to agree.
export const LIVE_CHANGED = 'arruhayn:live-changed'
export const announceLive = (ended?: number) => window.dispatchEvent(new CustomEvent(LIVE_CHANGED, { detail: { ended } }))
const CHECK_EVERY_MS = 30_000

export function LiveBannerView({ locale, initial, text }: { locale: Locale; initial: Live; text: { liveNow: string; joinClass: string } }) {
  const [live, setLive] = useState<Live>(initial)
  const pathname = usePathname()

  useEffect(() => {
    let stale = false
    const check = async () => {
      const res = await fetch(`/svc/live/now?locale=${locale}`, { cache: 'no-store' }).catch((): null => null)
      if (!res?.ok || stale) return
      setLive((await res.json().catch((): null => null)) as Live)
    }
    // Moving to another page is a good moment to check: the layout around it was not reloaded.
    const onChange = (e: Event) => {
      const ended = (e as CustomEvent<{ ended?: number }>).detail?.ended
      if (ended !== undefined) setLive((current) => (current?.id === ended ? null : current))
      check()
    }
    check()
    const timer = setInterval(check, CHECK_EVERY_MS)
    window.addEventListener(LIVE_CHANGED, onChange)
    return () => {
      stale = true
      clearInterval(timer)
      window.removeEventListener(LIVE_CHANGED, onChange)
    }
  }, [locale, pathname])

  if (!live) return null
  return (
    <div className="live-banner" role="status">
      <div className="wrap">
        <span className="live-dot" aria-hidden="true" />
        <span>
          <strong>{text.liveNow}:</strong> {live.title}
        </span>
        <Link href={`/${locale}/live/${live.id}`}>{text.joinClass} →</Link>
      </div>
    </div>
  )
}
