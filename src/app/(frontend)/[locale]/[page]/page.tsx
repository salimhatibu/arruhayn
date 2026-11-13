import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RichText } from '@/components/site/RichText'
import { t, type Locale } from '@/i18n/dictionary'
import { getSettings } from '@/lib/payload'

// About, privacy, and disclaimer pages, written in Site settings.
const PAGES = ['about', 'privacy', 'disclaimer'] as const
type PageName = (typeof PAGES)[number]

type Props = { params: Promise<{ locale: Locale; page: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params
  if (!PAGES.includes(page as PageName)) return {}
  return { title: t(locale).footer[page as PageName] }
}

export default async function StaticPage({ params }: Props) {
  const { locale, page } = await params
  if (!PAGES.includes(page as PageName)) notFound()
  const d = t(locale)
  const settings = await getSettings(locale)
  const body = page === 'about' ? settings.about : page === 'privacy' ? settings.privacy : null
  return (
    <article className="wrap reading">
      <h1>{d.footer[page as PageName]}</h1>
      {page === 'disclaimer' ? (
        <p className="prose">{settings.disclaimer || d.ask.disclaimer}</p>
      ) : body ? (
        <RichText value={body} />
      ) : page === 'privacy' ? (
        <div className="prose">
          <p>{d.ask.intro}</p>
          <p>{d.saved.intro}</p>
        </div>
      ) : (
        <p className="prose">{d.hero.body}</p>
      )}
    </article>
  )
}
