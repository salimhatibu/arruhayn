'use client'

import { useSyncExternalStore } from 'react'

import type { Locale } from '@/i18n/dictionary'

// Shows a date or time in the visitor's own time zone. The server cannot know where a visitor is
// (Workers run in UTC), so the first HTML says UTC and names it; once the page is running in the
// browser it is written again in the device's own zone and region.

const noop = () => () => {}
const intlLocale = (locale: Locale) => (locale === 'ar' ? 'ar-EG' : 'en-GB')

export const FULL: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
}

export function LocalTime({
  value,
  locale,
  options = FULL,
}: {
  value: string
  locale: Locale
  options?: Intl.DateTimeFormatOptions
}) {
  // false while rendering on the server and hydrating, true once in the browser.
  const inBrowser = useSyncExternalStore(noop, () => true, () => false)
  const text = new Intl.DateTimeFormat(intlLocale(locale), { ...options, ...(inBrowser ? {} : { timeZone: 'UTC' }) }).format(new Date(value))
  return <time dateTime={value}>{text}</time>
}
