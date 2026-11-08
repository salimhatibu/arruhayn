import Link from 'next/link'

import { getSettings } from '@/lib/payload'
import { t, type Locale } from '@/i18n/dictionary'

export async function Footer({ locale }: { locale: Locale }) {
  const d = t(locale)
  const settings = await getSettings(locale)
  const links: [string, string][] = [
    ['/about', d.footer.about],
    ['/ask', d.footer.ask],
    ['/glossary', d.footer.glossary],
    ['/news', d.news.title],
    ['/privacy', d.footer.privacy],
  ]
  return (
    <footer className="site-footer">
      <div className="wrap">
        <nav aria-label={d.footer.about}>
          {links.map(([path, label]) => (
            <Link key={path} href={`/${locale}${path}`}>
              {label}
            </Link>
          ))}
        </nav>
        <span>
          © {new Date().getFullYear()} {d.footer.rights}
        </span>
        <p className="disclaimer small">{settings?.disclaimer || d.ask.disclaimer}</p>
      </div>
    </footer>
  )
}
