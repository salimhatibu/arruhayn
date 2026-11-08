import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { MonthStart } from './hijri'

export const getPayloadClient = cache(() => getPayload({ config: configPromise }))

// Confirmed Hijri month starts, used everywhere a Hijri date is shown.
export const getMonthOverrides = cache(async (): Promise<MonthStart[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'hijri-months', limit: 200, depth: 0, pagination: false })
  return res.docs.map((d) => ({ year: d.year, month: Number(d.month), start: d.start }))
})

export const getTopics = cache(async (locale: 'en' | 'ar') => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'topics', locale, limit: 100, depth: 0, sort: 'order' })
  return res.docs
})

export const getLiveClass = cache(async (locale: 'en' | 'ar') => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'classes',
    locale,
    where: { status: { equals: 'live' } },
    limit: 1,
    depth: 0,
    sort: '-startsAt',
  })
  return res.docs[0] ?? null
})

export const getGlossary = cache(async (locale: 'en' | 'ar') => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'glossary', locale, limit: 500, depth: 0, pagination: false })
  return res.docs
})

export const getSettings = cache(async (locale: 'en' | 'ar') => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'site-settings', locale, depth: 0 })
})
