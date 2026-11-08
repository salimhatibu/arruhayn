import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import '@/styles/site.css'
import { Footer } from '@/components/site/Footer'
import { Header } from '@/components/site/Header'
import { LiveBanner } from '@/components/site/LiveBanner'
import { Motion } from '@/components/site/Motion'
import { fontVariables } from '@/fonts'
import { dir, isLocale, LOCALES, t } from '@/i18n/dictionary'

// Every page reads from the database, so nothing is pre-rendered at build time.
export const dynamic = 'force-dynamic'

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const d = t(locale)
  const base = process.env.PUBLIC_URL ?? 'http://localhost:3000'
  return {
    metadataBase: new URL(base),
    title: { default: `${d.siteName} · ${d.tagline}`, template: `%s · ${d.siteName}` },
    description: d.hero.body,
    icons: { icon: '/favicon.ico', apple: '/brand/apple-touch-icon.png' },
    openGraph: { siteName: d.siteName, images: ['/brand/og.jpg'], locale: locale === 'ar' ? 'ar_AR' : 'en_GB' },
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const d = t(locale)
  return (
    <html lang={locale} dir={dir(locale)} className={fontVariables}>
      <body>
        <a className="skip" href="#content">
          {d.skipToContent}
        </a>
        <LiveBanner locale={locale} />
        <Header locale={locale} />
        <main id="content">{children}</main>
        <Footer locale={locale} />
        <Motion />
      </body>
    </html>
  )
}
