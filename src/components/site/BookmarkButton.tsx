'use client'

import { useEffect, useState } from 'react'

import { bookmarkKey, onBookmarksChange, readBookmarks, writeBookmarks, type BookmarkType } from '@/lib/bookmarks'

export function BookmarkButton({
  type,
  id,
  title,
  href,
  labels,
}: {
  type: BookmarkType
  id: number | string
  title: string
  href: string
  labels: { save: string; saved: string }
}) {
  const key = bookmarkKey(type, id)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const sync = () => setSaved(readBookmarks().items.some((b) => b.id === key))
    sync()
    return onBookmarksChange(sync)
  }, [key])

  function toggle() {
    const state = readBookmarks()
    const items = saved
      ? state.items.filter((b) => b.id !== key)
      : [...state.items, { id: key, type, title, href, savedAt: new Date().toISOString() }]
    writeBookmarks({ ...state, items })
  }

  return (
    <button type="button" className="btn secondary small bookmark" aria-pressed={saved} onClick={toggle}>
      <span aria-hidden="true">{saved ? '★' : '☆'}</span>
      {saved ? labels.saved : labels.save}
    </button>
  )
}
