import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { AudioPlayer } from '@/components/site/AudioPlayer'
import { BookmarkButton } from '@/components/site/BookmarkButton'
import { ShareButton } from '@/components/site/ShareButton'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatDuration } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale; id: string }> }

const getRecording = cache(async (locale: Locale, id: number) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'recordings',
    locale,
    where: { and: [{ id: { equals: id } }, { status: { equals: 'published' } }] },
    limit: 1,
    depth: 1,
  })
  return res.docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const r = await getRecording(locale, Number(id))
  return r ? { title: r.title, description: r.description ?? undefined } : {}
}

export default async function RecordingPage({ params }: Props) {
  const { locale, id } = await params
  const r = Number.isInteger(Number(id)) ? await getRecording(locale, Number(id)) : null
  if (!r) notFound()
  const d = t(locale)
  const teacher = typeof r.teacher === 'object' ? r.teacher : null
  return (
    <article className="wrap reading">
      <Link href={`/${locale}/library`} className="small">
        ← {d.library.title}
      </Link>
      <h1 style={{ marginTop: '1rem' }}>{r.title}</h1>
      <div className="byline">
        {teacher ? <span>{teacher.name}</span> : null}
        <span>{formatDate(r.publishedAt, locale)}</span>
        {r.durationSeconds ? (
          <span>
            {d.library.duration}: {formatDuration(r.durationSeconds)}
          </span>
        ) : null}
        <BookmarkButton type="r" id={r.id} title={r.title} href={`/library/${r.id}`} labels={{ save: d.saved.save, saved: d.saved.savedLabel }} />
        <ShareButton title={r.title} path={`/${locale}/library/${r.id}`} locale={locale} />
      </div>
      <AudioPlayer
        id={r.id}
        src={`/media/${r.fileKey.split('/').map(encodeURIComponent).join('/')}`}
        labels={{ speed: d.library.speed, back15: d.library.back15, resume: d.library.resume }}
      />
      {r.description ? <p className="prose" style={{ marginTop: '1.5rem' }}>{r.description}</p> : null}
      {r.topics?.length ? (
        <div className="tags" style={{ marginTop: '1rem' }}>
          {r.topics.map((tp) =>
            typeof tp === 'object' ? (
              <Link key={tp.id} className="tag" href={`/${locale}/library?topic=${tp.slug}`}>
                {tp.name}
              </Link>
            ) : null,
          )}
        </div>
      ) : null}
    </article>
  )
}
