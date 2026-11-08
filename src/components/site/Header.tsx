import Link from 'next/link'

import { t, type Locale } from '@/i18n/dictionary'

import { DateStrip } from './DateStrip'
import { LanguageSwitch, NavLinks, NavToggle } from './HeaderClient'
import { Icon } from './Icon'

// Searching shows matching fatwas on the fatwas page; there is no separate search page.
function SearchForm({ locale, className, placeholder, label }: { locale: Locale; className: string; placeholder: string; label: string }) {
  return (
    <form className={className} action={`/${locale}/fatwas`} role="search">
      <Icon name="search" size={16} />
      <input type="search" name="q" placeholder={placeholder} aria-label={label} />
    </form>
  )
}

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
  ]
  return (
    <header className="site-header" id="site-header" data-home="false" data-scrolled="false">
      <DateStrip locale={locale} />
      <div className="wrap header-row">
        <Link className="wordmark" href={`/${locale}`} aria-label={d.nav.home}>
          <span className="wordmark-ar" lang="ar">
            الرُّحَين
          </span>
          <span className="wordmark-en">Arruhayn</span>
        </Link>
        <nav className="site-nav" id="site-nav" aria-label={d.nav.menu}>
          <SearchForm locale={locale} className="nav-search mobile-only" placeholder={d.hero.searchPlaceholder} label={d.nav.search} />
          <NavLinks locale={locale} links={links} />
          <LanguageSwitch locale={locale} label={d.switchLanguage} className="lang-switch mobile-only" />
        </nav>
        <div className="header-actions">
          <SearchForm locale={locale} className="search-pill desktop-only" placeholder={`${d.nav.search}…`} label={d.nav.search} />
          <LanguageSwitch locale={locale} label={d.switchLanguage} className="lang-switch desktop-only" />
          <NavToggle label={d.nav.menu} />
        </div>
      </div>
    </header>
  )
}
