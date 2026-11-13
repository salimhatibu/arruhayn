'use client'

import { useState } from 'react'

import { t, type Locale } from '@/i18n/dictionary'
import { readBookmarks, writeBookmarks } from '@/lib/bookmarks'

export function SharedList({
  locale,
  name,
  items,
}: {
  locale: Locale
  name: string
  items: { id: string; type: 'f' | 'n' | 'g' | 'r'; title: string; href: string }[]
}) {
  const d = t(locale).saved
  const [saved, setSaved] = useState(false)

  function saveCopy() {
    const state = readBookmarks()
    let list = name
    for (let i = 2; state.lists.includes(list); i++) list = `${name} (${i})`
    const existing = new Set(state.items.map((b) => b.id))
    writeBookmarks({
      lists: [...state.lists, list],
      items: [
        ...state.items.map((b) => (items.some((i) => i.id === b.id) ? { ...b, list } : b)),
        ...items
          .filter((i) => !existing.has(i.id))
          .map((i) => ({ id: i.id, type: i.type, title: i.title, href: i.href, savedAt: new Date().toISOString(), list })),
      ],
    })
    setSaved(true)
  }

  if (!items.length) return <p className="muted">{d.none}</p>
  return (
    <>
      <ul className="list">
        {items.map((i) => (
          <li key={i.id}>
            <a className="title" href={`/${locale}${i.href}`}>
              {i.title}
            </a>
          </li>
        ))}
      </ul>
      {saved ? (
        <p className="notice" role="status">
          {d.copySaved} · <a href={`/${locale}/saved`}>{d.title}</a>
        </p>
      ) : (
        <button className="btn" onClick={saveCopy} style={{ marginTop: '1rem' }}>
          {d.saveCopy}
        </button>
      )}
    </>
  )
}
