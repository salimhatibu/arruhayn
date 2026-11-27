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
// A token works once: after a failed submit, the form changes `resetKey` to get a fresh one, so the
// visitor can just try again instead of reloading the page.
export function Turnstile({
  siteKey,
  onToken,
  locale,
  resetKey = 0,
}: {
  siteKey: string
  onToken: (token: string) => void
  locale: string
  resetKey?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const widget = useRef<string | undefined>(undefined)
  const cb = useRef(onToken)
  useEffect(() => {
    cb.current = onToken
  })

  useEffect(() => {
    let id: string | undefined
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return
        id = widget.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          language: locale,
          appearance: 'always',
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

  useEffect(() => {
    if (!resetKey || !widget.current) return
    cb.current('')
    window.turnstile?.reset(widget.current)
  }, [resetKey])

  return <div ref={ref} />
}
