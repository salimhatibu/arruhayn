import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { LibraryRoom } from '@/components/site/LibraryRoom'
import type { Locale } from '@/i18n/dictionary'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale; id: string }> }

const getRecording = cache(async (locale: Locale, id: number) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'recordings',
    locale,
    where: { and: [{ id: { equals: id } }, { status: { equals: 'published' } }] },
    limit: 1,
    depth: 0,
  })
  return res.docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const r = await getRecording(locale, Number(id))
  return r ? { title: r.title, description: r.description ?? undefined } : {}
}

// One recording: the listening room with this recording chosen.
export default async function RecordingPage({ params }: Props) {
  const { locale, id } = await params
  const r = Number.isInteger(Number(id)) ? await getRecording(locale, Number(id)) : null
  if (!r) notFound()
  return <LibraryRoom locale={locale} selectedId={r.id} />
}
