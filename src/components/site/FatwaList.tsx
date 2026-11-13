import Link from 'next/link'

import type { Fatwa, Topic } from '@/payload-types'
import { t, type Locale } from '@/i18n/dictionary'
import { formatDate, formatNumber, textDir } from '@/lib/format'
import { excerpt } from '@/lib/lexical'

import { ShareButton } from './ShareButton'

export const fatwaTopics = (f: Fatwa) =>
  (f.topics ?? []).filter((x): x is Topic => typeof x === 'object')

// The line above a headline, newspaper style: the fatwa number in red and its topic in a box.
export function Dateline({
  fatwa,
  locale,
  index,
}: {
  fatwa: Fatwa
  locale: Locale
  index?: number
}) {
  const topic = fatwaTopics(fatwa)[0]
  return (
    <div className="dateline">
      <span className="dateline-no">
        {formatNumber(index ?? fatwa.number ?? 0, locale).padStart(2, locale === 'ar' ? '٠' : '0')}
      </span>
      {topic ? (
        <Link className="boxed" href={`/${locale}/fatwas?topic=${topic.slug}`}>
          {topic.name}
        </Link>
      ) : null}
    </div>
  )
}

// "Read" and "Share" under a story.
export function StoryActions({
  href,
  title,
  locale,
  label,
}: {
  href: string
  title: string
  locale: Locale
  label?: string
}) {
  const d = t(locale)
  return (
    <div className="story-actions">
      <Link className="read-link" href={`/${locale}${href}`}>
        {label ?? d.read}
      </Link>
      <ShareButton title={title} path={`/${locale}${href}`} locale={locale} compact />
    </div>
  )
}

export function FatwaList({ fatwas, locale, level = 'h3' }: { fatwas: Fatwa[]; locale: Locale; level?: 'h2' | 'h3' }) {
  const Title = level
  const d = t(locale)
  if (!fatwas.length) return <p className="muted">{d.noFatwas}</p>
  return (
    <ul className="story-list">
      {fatwas.map((f) => {
        const scholar = typeof f.scholar === 'object' ? f.scholar : null
        return (
          <li key={f.id} className="story" data-reveal>
            <Dateline fatwa={f} locale={locale} />
            <Title className="story-title" {...textDir(f.title, locale)}>
              <Link href={`/${locale}/fatwas/${f.number}`}>{f.title}</Link>
            </Title>
            <p className="story-deck" {...textDir(f.question, locale)}>
              {excerpt(f.question, 200)}
            </p>
            <p className="byline-mono">
              {scholar ? <span>{scholar.name}</span> : null}
              {f.publishedAt ? <span>{formatDate(f.publishedAt, locale)}</span> : null}
            </p>
            <StoryActions href={`/fatwas/${f.number}`} title={f.title} locale={locale} />
          </li>
        )
      })}
    </ul>
  )
}
