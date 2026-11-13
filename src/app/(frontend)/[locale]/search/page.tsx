import { redirect } from 'next/navigation'

import type { Locale } from '@/i18n/dictionary'

// Search results now appear on the fatwas page. Old links to /search still work.
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ q?: string }>
}) {
  const { locale } = await params
  const { q } = await searchParams
  redirect(`/${locale}/fatwas${q ? `?q=${encodeURIComponent(q)}` : ''}`)
}
