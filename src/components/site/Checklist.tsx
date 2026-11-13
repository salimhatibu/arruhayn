'use client'

import { t, type Locale } from '@/i18n/dictionary'
import { useLocalValue } from '@/lib/use-local'

// A checklist whose ticks are saved in this browser only.
export function Checklist({
  storageKey,
  items,
  locale,
}: {
  storageKey: string
  items: { id: string; title: string }[]
  locale: Locale
}) {
  const d = t(locale).guides
  const [done, setDone] = useLocalValue<string[]>(storageKey, [])

  function toggle(id: string) {
    setDone(done.includes(id) ? done.filter((x) => x !== id) : [...done, id])
  }

  const count = items.filter((i) => done.includes(i.id)).length
  return (
    <section style={{ marginTop: '1.5rem' }}>
      <p className="muted small" aria-live="polite">
        {d.progress(count, items.length)}
      </p>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${items.length ? (count / items.length) * 100 : 0}%` }} />
      </div>
      <ul className="checklist" style={{ marginTop: '1rem' }}>
        {items.map((item) => (
          <li key={item.id}>
            <input id={`c-${item.id}`} type="checkbox" checked={done.includes(item.id)} onChange={() => toggle(item.id)} />
            <label htmlFor={`c-${item.id}`} style={{ fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
              {item.title}
            </label>
          </li>
        ))}
      </ul>
      <p className="help">{d.savedOnDevice}</p>
    </section>
  )
}
