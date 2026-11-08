'use client'

// Bookmarks and reading lists live in this browser's localStorage only. Nothing is sent to the
// server. Every read and write is guarded, since storage can be unavailable (private windows).

export type BookmarkType = 'f' | 'n' | 'g' | 'r'
export type Bookmark = { id: string; type: BookmarkType; title: string; href: string; savedAt: string; list?: string }
export type BookmarkState = { items: Bookmark[]; lists: string[] }

const KEY = 'arruhayn:bookmarks'
const EVENT = 'arruhayn:bookmarks'

export function readBookmarks(): BookmarkState {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as BookmarkState) : null
    return { items: parsed?.items ?? [], lists: parsed?.lists ?? [] }
  } catch {
    return { items: [], lists: [] }
  }
}

export function writeBookmarks(state: BookmarkState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    window.dispatchEvent(new Event(EVENT))
  } catch {
    // Storage is unavailable; the change only lasts until the page is closed.
  }
}

export function onBookmarksChange(fn: () => void) {
  const handler = () => fn()
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export const bookmarkKey = (type: BookmarkType, id: string | number) => `${type}-${id}`
