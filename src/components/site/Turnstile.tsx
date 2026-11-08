'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`)
    const s = existing ?? document.createElement('script')
    s.addEventListener('load', () => resolve())
    s.addEventListener('error', () => reject(new Error('Turnstile failed to load')))
    if (!existing) {
      s.src = SCRIPT
      s.async = true
      document.head.appendChild(s)
    }
  })
}

// Invisible-when-possible bot check for public forms. Calls onToken with each new token.
export function Turnstile({ siteKey, onToken, locale }: { siteKey: string; onToken: (token: string) => void; locale: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const cb = useRef(onToken)
  cb.current = onToken

  useEffect(() => {
    let id: string | undefined
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return
        id = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          language: locale,
          appearance: 'interaction-only',
          callback: (token: string) => cb.current(token),
          'expired-callback': () => cb.current(''),
        })
      })
      .catch(() => cb.current(''))
    return () => {
      cancelled = true
      if (id) window.turnstile?.remove(id)
    }
  }, [siteKey, locale])

  return <div ref={ref} />
}
