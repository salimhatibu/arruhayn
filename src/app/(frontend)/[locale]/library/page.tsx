import type { Metadata } from 'next'

import { LibraryRoom } from '@/components/site/LibraryRoom'
import { t, type Locale } from '@/i18n/dictionary'

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ topic?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: t(locale).library.title,
    alternates: { types: { 'application/rss+xml': `/${locale}/feed.xml` } },
  }
}

export default async function LibraryPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { topic } = await searchParams
  return <LibraryRoom locale={locale} topic={topic} />
}
