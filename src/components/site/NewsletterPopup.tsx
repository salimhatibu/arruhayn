'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '@/i18n/dictionary'

import { SubscribeForm } from './SubscribeForm'

export function NewsletterPopup({ locale, siteKey }: { locale: Locale; siteKey: string }) {
  const d = t(locale)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try { if (localStorage.getItem('arruhayn-subscribed') || localStorage.getItem('arruhayn-popup-dismissed')) return } catch {}
    const timer = setTimeout(() => setOpen(true), 8000)
    return () => clearTimeout(timer)
  }, [])

  if (!open) return null

  function dismiss() {
    setOpen(false)
    try { localStorage.setItem('arruhayn-popup-dismissed', '1') } catch {}
  }

  return (
    <div className="nl-popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}>
      <div className="nl-popup" role="dialog" aria-label={d.home.newsletterTitle}>
        <button className="nl-popup-close" onClick={dismiss} aria-label="Close">×</button>
        <h2>{d.home.newsletterTitle}</h2>
        <p>{d.home.newsletterBody}</p>
        <SubscribeForm locale={locale} siteKey={siteKey} onSuccess={dismiss} />
      </div>
    </div>
  )
}
