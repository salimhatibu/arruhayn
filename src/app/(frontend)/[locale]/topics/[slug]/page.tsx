import { notFound, redirect } from 'next/navigation'

import type { Locale } from '@/i18n/dictionary'
import { getTopics } from '@/lib/payload'

// Topic pages are the fatwa list filtered by topic.
export default async function TopicPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params
  const topics = await getTopics(locale)
  if (!topics.some((t) => t.slug === slug)) notFound()
  redirect(`/${locale}/fatwas?topic=${encodeURIComponent(slug)}`)
}
