'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { Locale } from '@/i18n/dictionary'

import { Icon } from './Icon'

export function NavToggle({ label }: { label: string }) {
  const pathname = usePathname()
  // The menu belongs to the page it was opened on, so it closes when the page changes.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  useEffect(() => {
    document.getElementById('site-header')?.setAttribute('data-open', String(open))
    document.documentElement.toggleAttribute('data-menu-open', open)
  }, [open])
  return (
    <button
      className="nav-toggle"
      aria-expanded={open}
      aria-controls="site-nav"
      aria-label={label}
      onClick={() => setOpenOn(open ? null : pathname)}
    >
      <Icon name={open ? 'close' : 'menu'} size={22} />
    </button>
  )
}

// Marks the link for the section the visitor is in.
export function NavLinks({ locale, links }: { locale: Locale; links: [string, string][] }) {
  const pathname = usePathname() ?? ''
  return links.map(([path, label]) => {
    const target = `/${locale}${path}`
    const current = pathname === target || pathname.startsWith(`${target}/`)
    return (
      <Link key={path} href={target} aria-current={current ? 'page' : undefined}>
        {label}
      </Link>
    )
  })
}

// Links to the same page in the other language.
export function LanguageSwitch({ locale, label, className }: { locale: Locale; label: string; className?: string }) {
  const pathname = usePathname() ?? `/${locale}`
  const other = locale === 'en' ? 'ar' : 'en'
  const target = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${other}`)
  return (
    <a className={className} href={target} hrefLang={other} lang={other}>
      {label}
    </a>
  )
}
