/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'

import { t, type Locale } from '@/i18n/dictionary'

import { LanguageSwitch, NavToggle } from './HeaderClient'

export function Header({ locale }: { locale: Locale }) {
  const d = t(locale)
  const links: [string, string][] = [
    ['/fatwas', d.nav.fatwas],
    ['/newsletters', d.nav.newsletters],
    ['/live', d.nav.live],
    ['/library', d.nav.library],
    ['/calendar', d.nav.calendar],
    ['/guides', d.nav.guides],
    ['/saved', d.nav.saved],
    ['/search', d.nav.search],
  ]
  return (
    <header className="site-header" id="site-header">
      <div className="wrap">
        <Link className="brand" href={`/${locale}`} aria-label={d.nav.home}>
          <img src="/brand/icon-192.png" alt="" width={46} height={46} />
          <span>الرُّحَين</span>
        </Link>
        <NavToggle label={d.nav.menu} />
        <nav className="site-nav" aria-label={d.nav.menu}>
          {links.map(([path, label]) => (
            <Link key={path} href={`/${locale}${path}`}>
              {label}
            </Link>
          ))}
          <LanguageSwitch locale={locale} label={d.switchLanguage} />
        </nav>
      </div>
    </header>
  )
}
