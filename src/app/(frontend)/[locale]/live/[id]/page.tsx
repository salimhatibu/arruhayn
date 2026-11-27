import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LiveRoom } from '@/components/live/LiveRoom'
import { UnsavedRecordings } from '@/components/live/UnsavedRecordings'
import { WaitForLive } from '@/components/live/WaitForLive'
import { LocalTime } from '@/components/site/LocalTime'
import { ShareButton } from '@/components/site/ShareButton'
import { t, type Locale } from '@/i18n/dictionary'
import { speakerName } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'
import { presetNames, realtimeConfigured } from '@/lib/realtimekit'
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
  const speaker = speakerName(cls)
  return (
    <div className="wrap" style={{ maxWidth: 960 }}>
      <h1>{cls.title}</h1>
      <div className="byline">
        {speaker ? <span>{speaker}</span> : null}
        <span>
          <LocalTime value={cls.startsAt} locale={locale} />
        </span>
        <ShareButton title={cls.title} path={`/${locale}/live/${cls.id}`} locale={locale} />
      </div>
      {cls.description ? <p className="reading">{cls.description}</p> : null}
      <UnsavedRecordings locale={locale} />
      {cls.status === 'live' ? (
        realtimeConfigured() ? (
          <LiveRoom classId={cls.id} title={cls.title} locale={locale} siteKey={turnstileSiteKey()} hostPreset={presetNames().host}
            allowRecording={Boolean(cls.allowRecording)}
          />
        ) : (
          <p className="notice">{d.live.notConfigured}</p>
        )
      ) : cls.status === 'ended' ? (
        <p className="notice">{d.live.ended}</p>
      ) : (
        <WaitForLive classId={cls.id} startsAt={cls.startsAt} locale={locale} />
      )}
    </div>
  )
}
