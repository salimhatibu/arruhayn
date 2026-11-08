import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LiveRoom } from '@/components/live/LiveRoom'
import { ShareButton } from '@/components/site/ShareButton'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDateTime } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'
import { realtimeConfigured } from '@/lib/realtimekit'
import { turnstileSiteKey } from '@/lib/turnstile'

type Props = { params: Promise<{ locale: Locale; id: string }> }

async function getClass(locale: Locale, id: number) {
  const payload = await getPayloadClient()
  return payload.findByID({ collection: 'classes', id, locale, depth: 1, disableErrors: true })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const cls = await getClass(locale, Number(id))
  return cls ? { title: cls.title, description: cls.description ?? undefined } : {}
}

export default async function ClassPage({ params }: Props) {
  const { locale, id } = await params
  const cls = Number.isInteger(Number(id)) ? await getClass(locale, Number(id)) : null
  if (!cls || cls.status === 'cancelled') notFound()
  const d = t(locale)
  const teacher = typeof cls.teacher === 'object' ? cls.teacher : null
  return (
    <div className="wrap" style={{ maxWidth: 960 }}>
      <h1>{cls.title}</h1>
      <div className="byline">
        {teacher ? <span>{teacher.name}</span> : null}
        <span>{formatDateTime(cls.startsAt, locale)}</span>
        <ShareButton title={cls.title} path={`/${locale}/live/${cls.id}`} locale={locale} />
      </div>
      {cls.description ? <p className="reading">{cls.description}</p> : null}
      {cls.status === 'live' ? (
        realtimeConfigured() ? (
          <LiveRoom classId={cls.id} title={cls.title} locale={locale} siteKey={turnstileSiteKey()} />
        ) : (
          <p className="notice">{d.live.notConfigured}</p>
        )
      ) : cls.status === 'ended' ? (
        <p className="notice">{d.live.ended}</p>
      ) : (
        <p className="notice">
          {d.live.notLive} {formatDateTime(cls.startsAt, locale)}.
        </p>
      )}
    </div>
  )
}
