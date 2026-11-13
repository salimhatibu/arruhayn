import type { Metadata } from 'next'
import Link from 'next/link'

import { t, type Locale } from '@/i18n/dictionary'
import { formatDateTime } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).live.title }
}

export default async function LivePage({ params }: Props) {
  const { locale } = await params
  const d = t(locale)
  const payload = await getPayloadClient()
  const now = new Date()
  const [live, upcoming, past] = await Promise.all([
    payload.find({ collection: 'classes', locale, where: { status: { equals: 'live' } }, depth: 1, limit: 5 }),
    payload.find({
      collection: 'classes',
      locale,
      where: { and: [{ status: { equals: 'scheduled' } }, { startsAt: { greater_than: new Date(now.getTime() - 3 * 3600_000).toISOString() } }] },
      sort: 'startsAt',
      depth: 1,
      limit: 20,
    }),
    payload.find({ collection: 'classes', locale, where: { status: { equals: 'ended' } }, sort: '-startsAt', depth: 1, limit: 5 }),
  ])
  const item = (c: (typeof upcoming.docs)[number]) => (
    <li key={c.id}>
      <Link className="title" href={`/${locale}/live/${c.id}`}>
        {c.title}
      </Link>
      <div className="meta">
        <span>{formatDateTime(c.startsAt, locale)}</span>
        {typeof c.teacher === 'object' && c.teacher ? <span>{c.teacher.name}</span> : null}
        {c.durationMinutes ? (
          <span>
            {c.durationMinutes} {d.minutes}
          </span>
        ) : null}
      </div>
    </li>
  )
  return (
    <div className="wrap reading">
      <h1>{d.live.title}</h1>
      <p className="muted">{d.live.intro}</p>
      {live.docs.map((c) => (
        <Link key={c.id} href={`/${locale}/live/${c.id}`} className="card issue-card" style={{ borderColor: 'var(--magenta)', marginBlock: '1rem' }}>
          <span className="rec">{d.liveNow}</span>
          <h3>{c.title}</h3>
          <span className="btn small">{d.joinClass}</span>
        </Link>
      ))}
      <h2>{d.live.upcoming}</h2>
      {upcoming.docs.length ? <ul className="list">{upcoming.docs.map(item)}</ul> : <p className="muted">{d.live.none}</p>}
      <p>
        <Link href={`/${locale}/calendar`}>{d.calendar.title} →</Link>
      </p>
      {past.docs.length ? (
        <>
          <h2>{d.live.past}</h2>
          <ul className="list">{past.docs.map(item)}</ul>
          <p>
            <Link href={`/${locale}/library`}>{d.library.title} →</Link>
          </p>
        </>
      ) : null}
    </div>
  )
}
