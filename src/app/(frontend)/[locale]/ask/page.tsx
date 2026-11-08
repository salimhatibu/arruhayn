import type { Metadata } from 'next'

import { AskForm } from '@/components/site/AskForm'
import { t, type Locale } from '@/i18n/dictionary'
import { turnstileSiteKey } from '@/lib/turnstile'

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).ask.title }
}

export default async function AskPage({ params }: Props) {
  const { locale } = await params
  const d = t(locale)
  return (
    <div className="wrap reading">
      <h1>{d.ask.title}</h1>
      <p className="muted">{d.ask.intro}</p>
      <AskForm locale={locale} siteKey={turnstileSiteKey()} />
      <p className="muted small" style={{ marginTop: '2rem' }}>
        {d.ask.disclaimer}
      </p>
    </div>
  )
}
