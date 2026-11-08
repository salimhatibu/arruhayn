'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { Locale } from '@/i18n/dictionary'

export function NavToggle({ label }: { label: string }) {
  const pathname = usePathname()
  // The menu belongs to the page it was opened on, so it closes when the page changes.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  useEffect(() => {
    document.getElementById('site-header')?.setAttribute('data-open', String(open))
  }, [open])
  return (
    <button className="btn ghost nav-toggle" aria-expanded={open} onClick={() => setOpenOn(open ? null : pathname)}>
      {label}
    </button>
  )
}

// Links to the same page in the other language.
export function LanguageSwitch({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() ?? `/${locale}`
  const other = locale === 'en' ? 'ar' : 'en'
  const target = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${other}`)
  return (
    <a className="lang-switch" href={target} hrefLang={other} lang={other}>
      {label}
    </a>
  )
}
