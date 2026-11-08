import Link from 'next/link'

import { getSettings } from '@/lib/payload'
import { t, type Locale } from '@/i18n/dictionary'

import { Icon } from './Icon'

export async function Footer({ locale }: { locale: Locale }) {
  const d = t(locale)
  const settings = await getSettings(locale)
  const primary: [string, string][] = [
    ['/fatwas', d.nav.fatwas],
    ['/newsletters', d.nav.newsletters],
    ['/live', d.nav.live],
    ['/library', d.nav.library],
    ['/calendar', d.nav.calendar],
    ['/guides', d.nav.guides],
  ]
  const secondary: [string, string][] = [
    ['/about', d.footer.about],
    ['/ask', d.footer.ask],
    ['/glossary', d.footer.glossary],
    ['/news', d.news.title],
    ['/saved', d.nav.saved],
    ['/privacy', d.footer.privacy],
    ['/disclaimer', d.footer.disclaimer],
  ]
  return (
    <footer className="site-footer">
      <div className="wrap">
        <Link className="wordmark" href={`/${locale}`} aria-label={d.nav.home}>
          <span className="wordmark-ar" lang="ar">
            الرُّحَين
          </span>
          <span className="wordmark-en">Arruhayn</span>
        </Link>
        <nav className="footer-primary" aria-label={d.nav.menu}>
          {primary.map(([path, label]) => (
            <Link key={path} href={`/${locale}${path}`}>
              {label}
            </Link>
          ))}
        </nav>
        <nav className="footer-secondary" aria-label={d.footer.about}>
          {secondary.map(([path, label]) => (
            <Link key={path} href={`/${locale}${path}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="footer-icons">
          <a href={`/${locale}/feed.xml`} aria-label="RSS">
            <Icon name="rss" size={20} />
          </a>
          <Link href={`/${locale}/calendar`} aria-label={d.nav.calendar}>
            <Icon name="calendar" size={20} />
          </Link>
          <Link href={`/${locale}/newsletters`} aria-label={d.nav.newsletters}>
            <Icon name="mail" size={20} />
          </Link>
          <Link href={`/${locale}/search`} aria-label={d.nav.search}>
            <Icon name="search" size={20} />
          </Link>
        </div>
        <div className="footer-base">
          <span>
            © {new Date().getFullYear()} {d.footer.rights}
          </span>
          <p>{settings?.disclaimer || d.ask.disclaimer}</p>
        </div>
      </div>
    </footer>
  )
}
