import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { BookmarkButton } from '@/components/site/BookmarkButton'
import { Checklist } from '@/components/site/Checklist'
import { RichText } from '@/components/site/RichText'
import { ShareButton } from '@/components/site/ShareButton'
import { t, type Locale } from '@/i18n/dictionary'
import { getGlossary, getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale; slug: string }>; searchParams: Promise<{ step?: string }> }

const getGuide = cache(async (locale: Locale, slug: string) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'guides',
    locale,
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] },
    limit: 1,
    depth: 1,
  })
  return res.docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const guide = await getGuide(locale, slug)
  return guide ? { title: guide.title, description: guide.summary ?? undefined } : {}
}

export default async function GuidePage({ params, searchParams }: Props) {
  const { locale, slug } = await params
  const guide = await getGuide(locale, slug)
  if (!guide) notFound()
  const d = t(locale)
  const glossary = await getGlossary(locale)
  const steps = guide.steps ?? []
  const fatwaLink = (s: (typeof steps)[number]) =>
    s.fatwa && typeof s.fatwa === 'object' && s.fatwa.status === 'published' ? (
      <p>
        <Link href={`/${locale}/fatwas/${s.fatwa.number}`}>
          {d.guides.readFatwa}: {s.fatwa.title} →
        </Link>
      </p>
    ) : null

  const header = (
    <>
      <Link href={`/${locale}/guides`} className="small">
        ← {d.guides.title}
      </Link>
      <h1 style={{ marginTop: '1rem' }}>{guide.title}</h1>
      <div className="byline">
        {guide.summary ? <span>{guide.summary}</span> : null}
        <BookmarkButton type="g" id={guide.slug} title={guide.title} href={`/guides/${guide.slug}`} labels={{ save: d.saved.save, saved: d.saved.savedLabel }} />
        <ShareButton title={guide.title} path={`/${locale}/guides/${guide.slug}`} locale={locale} />
      </div>
      <RichText value={guide.intro} glossary={glossary} />
    </>
  )

  if (guide.type === 'checklist') {
    return (
      <article className="wrap reading">
        {header}
        <Checklist
          storageKey={`guide:${guide.slug}`}
          items={steps.map((s) => ({ id: s.id ?? s.title, title: s.title }))}
          locale={locale}
        />
      </article>
    )
  }

  if (guide.type === 'path') {
    const current = Math.min(Math.max(1, Number((await searchParams).step) || 1), Math.max(steps.length, 1))
    const step = steps[current - 1]
    return (
      <article className="wrap reading">
        {header}
        {step ? (
          <section className="card" style={{ marginTop: '1.5rem' }}>
            <p className="label">{d.guides.stepOf(current, steps.length)}</p>
            <div className="progress" aria-hidden="true">
              <span style={{ width: `${(current / steps.length) * 100}%` }} />
            </div>
            <h2>{step.title}</h2>
            <RichText value={step.body} glossary={glossary} />
            {fatwaLink(step)}
            <nav className="pager">
              {current > 1 ? (
                <Link className="btn secondary small" href={`?step=${current - 1}`}>
                  {d.previous}
                </Link>
              ) : (
                <span />
              )}
              {current < steps.length ? (
                <Link className="btn small" href={`?step=${current + 1}`}>
                  {d.next}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </section>
        ) : null}
        <ol style={{ marginTop: '2rem' }}>
          {steps.map((s, i) => (
            <li key={s.id ?? i}>
              {i + 1 === current ? <strong>{s.title}</strong> : <Link href={`?step=${i + 1}`}>{s.title}</Link>}
            </li>
          ))}
        </ol>
      </article>
    )
  }

  return (
    <article className="wrap reading">
      {header}
      {steps.map((s, i) => (
        <section key={s.id ?? i}>
          <h2>{s.title}</h2>
          <RichText value={s.body} glossary={glossary} />
          {fatwaLink(s)}
        </section>
      ))}
    </article>
  )
}
