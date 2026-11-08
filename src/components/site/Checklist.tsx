'use client'

import { useEffect, useState } from 'react'

import type { Locale } from '@/i18n/dictionary'

// A checklist whose ticks are saved in this browser only.
export function Checklist({
  storageKey,
  items,
  labels,
  locale,
}: {
  storageKey: string
  items: { id: string; title: string }[]
  labels: { progress: (a: number, b: number) => string; savedOnDevice: string }
  locale: Locale
}) {
  const [done, setDone] = useState<string[]>([])

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(storageKey) ?? '[]'))
    } catch {
      setDone([])
    }
  }, [storageKey])

  function toggle(id: string) {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id]
    setDone(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // Storage unavailable; ticks last until the page is closed.
    }
  }

  const count = items.filter((i) => done.includes(i.id)).length
  return (
    <section style={{ marginTop: '1.5rem' }} lang={locale}>
      <p className="muted small" aria-live="polite">
        {labels.progress(count, items.length)}
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
      <p className="help">{labels.savedOnDevice}</p>
    </section>
  )
}
