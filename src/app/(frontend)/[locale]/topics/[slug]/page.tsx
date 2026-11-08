import { redirect } from 'next/navigation'

// Topic pages are the fatwa list filtered by topic.
export default async function TopicPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  redirect(`/${locale}/fatwas?topic=${encodeURIComponent(slug)}`)
}
