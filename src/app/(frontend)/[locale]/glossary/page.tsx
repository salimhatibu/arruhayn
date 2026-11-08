import type { Metadata } from 'next'

import { t, type Locale } from '@/i18n/dictionary'
import { getGlossary } from '@/lib/payload'

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: t(locale).glossary.title }
}

export default async function GlossaryPage({ params }: Props) {
  const { locale } = await params
  const d = t(locale)
  const terms = [...(await getGlossary(locale))].sort((a, b) =>
    a.term.replace(/^ال/, '').localeCompare(b.term.replace(/^ال/, ''), locale),
  )
  return (
    <div className="wrap reading">
      <h1>{d.glossary.title}</h1>
      <p className="muted">{d.glossary.intro}</p>
      <dl>
        {terms.map((g) => (
          <div key={g.id} id={encodeURIComponent(g.term)} style={{ borderBottom: '1px solid var(--line)', padding: '0.9rem 0', scrollMarginTop: '1rem' }}>
            <dt>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{g.term}</h2>
              {g.spellings?.length ? <span className="muted small">{g.spellings.join(', ')}</span> : null}
            </dt>
            <dd style={{ margin: '0.3rem 0 0' }}>{g.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
