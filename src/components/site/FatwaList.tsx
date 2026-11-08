import Link from 'next/link'

import type { Fatwa, Topic } from '@/payload-types'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatNumber } from '@/lib/format'
import { excerpt } from '@/lib/lexical'

import { FatwaCover } from './FatwaCover'
import { Icon } from './Icon'

export const fatwaTopics = (f: Fatwa) => (f.topics ?? []).filter((x): x is Topic => typeof x === 'object')

// The small label above a fatwa title: an icon and its main topic.
export function Kicker({ topic, locale }: { topic?: Topic; locale: Locale }) {
  const d = t(locale)
  return (
    <span className="kicker">
      <Icon name="fatwa" size={14} />
      {topic ? topic.name : d.fatwa}
    </span>
  )
}

export function FatwaList({ fatwas, locale, covers = true }: { fatwas: Fatwa[]; locale: Locale; covers?: boolean }) {
  const d = t(locale)
  if (!fatwas.length) return <p className="muted">{d.noFatwas}</p>
  return (
    <ul className="entry-list">
      {fatwas.map((f) => {
        const topics = fatwaTopics(f)
        const scholar = typeof f.scholar === 'object' ? f.scholar : null
        return (
          <li key={f.id} className="entry" data-reveal>
            <div className="entry-body">
              <Kicker topic={topics[0]} locale={locale} />
              <h3 className="entry-title">
                <Link href={`/${locale}/fatwas/${f.number}`}>{f.title}</Link>
              </h3>
              <p className="entry-excerpt">{excerpt(f.question, 170)}</p>
              <div className="entry-meta">
                <span>
                  {d.fatwaNumber} {formatNumber(f.number ?? 0, locale)}
                </span>
                {scholar ? <span>{scholar.name}</span> : null}
                {f.publishedAt ? <span>{formatDate(f.publishedAt, locale)}</span> : null}
              </div>
              {topics.length > 1 ? (
                <div className="pills">
                  {topics.map((tp) => (
                    <Link key={tp.id} className="pill" href={`/${locale}/fatwas?topic=${tp.slug}`}>
                      {tp.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            {covers ? (
              <Link className="entry-cover" href={`/${locale}/fatwas/${f.number}`} tabIndex={-1} aria-hidden="true">
                <FatwaCover slug={topics[0]?.slug} number={f.number} size="sm" />
              </Link>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
