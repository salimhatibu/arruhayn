import type { Metadata } from 'next'

import { SavedLists } from '@/components/site/SavedLists'
import { t, type Locale } from '@/i18n/dictionary'

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).saved.title, robots: { index: false } }
}

export default async function SavedPage({ params }: Props) {
  const { locale } = await params
  const d = t(locale)
  return (
    <div className="wrap reading">
      <h1>{d.saved.title}</h1>
      <p className="muted">{d.saved.intro}</p>
      <SavedLists locale={locale} />
    </div>
  )
}
