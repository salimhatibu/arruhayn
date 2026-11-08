import topicData from '../../../content/topics.json'

// A typographic cover for a fatwa card: the topic's Arabic name set large in Amiri over a
// geometric pattern, coloured by topic. Fatwas have no images, so this stands in for one.

const SHORT: Record<string, string> = { 'invalid-marriages': 'الأنكحة الفاسدة' }
const ARABIC = new Map(topicData.map((t) => [t.slug, SHORT[t.slug] ?? t.name.ar.replace(/\s*\(.*\)\s*/, '')]))
const TONES = ['plum', 'rust', 'violet', 'magenta', 'ink', 'sage'] as const

export function FatwaCover({
  slug,
  number,
  size = 'md',
}: {
  slug?: string | null
  number?: number | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const index = topicData.findIndex((t) => t.slug === slug)
  const tone = TONES[(index < 0 ? 0 : index) % TONES.length]
  return (
    <div className={`cover cover-${size} tone-${tone}`} aria-hidden="true">
      <span className="cover-word" lang="ar">
        {(slug && ARABIC.get(slug)) || 'فتوى'}
      </span>
      {number ? <span className="cover-no">{String(number).padStart(3, '0')}</span> : null}
    </div>
  )
}
