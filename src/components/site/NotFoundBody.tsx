'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { isLocale, t } from '@/i18n/dictionary'

// The body of the 404 page, in the visitor's language: a search box and a few places to go.
// The page gets no params of its own here, so the language is read from the address.
export function NotFoundBody() {
  const params = useParams<{ locale?: string }>()
  const locale = params?.locale && isLocale(params.locale) ? params.locale : 'en'
  const d = t(locale)
  return (
    <div className="wrap reading not-found" style={{ paddingBlock: 'clamp(2rem, 6vw, 4rem)' }}>
      <p className="small muted" style={{ letterSpacing: '0.2em' }}>404</p>
      <h1>{d.notFound}</h1>
      <p>{d.notFoundBody}</p>
      <form action={`/${locale}/fatwas`} className="search-row" role="search">
        <input type="search" name="q" maxLength={200} placeholder={d.hero.searchPlaceholder} aria-label={d.hero.searchPlaceholder} />
        <button className="btn" type="submit">
          {d.nav.search}
        </button>
      </form>
      <ul className="not-found-links">
        <li>
          <Link href={`/${locale}`}>{d.goHome}</Link>
        </li>
        <li>
          <Link href={`/${locale}/fatwas`}>{d.nav.fatwas}</Link>
        </li>
        <li>
          <Link href={`/${locale}/library`}>{d.nav.library}</Link>
        </li>
        <li>
          <Link href={`/${locale}/live`}>{d.nav.live}</Link>
        </li>
        <li>
          <Link href={`/${locale}/ask`}>{d.ask.title}</Link>
        </li>
      </ul>
    </div>
  )
}
