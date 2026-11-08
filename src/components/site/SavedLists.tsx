'use client'

import { useEffect, useMemo, useState } from 'react'

import { t, type Locale } from '@/i18n/dictionary'
import { onBookmarksChange, readBookmarks, writeBookmarks, type Bookmark, type BookmarkState } from '@/lib/bookmarks'

// The visitor's bookmarks, grouped into named lists. Everything stays in this browser.
export function SavedLists({ locale }: { locale: Locale }) {
  const d = t(locale).saved
  const [state, setState] = useState<BookmarkState>({ items: [], lists: [] })
  const [newList, setNewList] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setState(readBookmarks())
    sync()
    return onBookmarksChange(sync)
  }, [])

  const groups = useMemo(() => {
    const out = new Map<string, Bookmark[]>([['', []], ...state.lists.map((l) => [l, []] as [string, Bookmark[]])])
    for (const b of state.items) {
      const key = b.list && state.lists.includes(b.list) ? b.list : ''
      out.get(key)!.push(b)
    }
    return out
  }, [state])

  const save = (next: BookmarkState) => {
    setState(next)
    writeBookmarks(next)
  }

  function createList() {
    const name = newList.trim().slice(0, 60)
    if (!name || state.lists.includes(name)) return
    save({ ...state, lists: [...state.lists, name] })
    setNewList('')
  }

  async function share(list: string, items: Bookmark[]) {
    const q = new URLSearchParams({ items: items.map((i) => i.id).join(','), name: list || d.unsorted })
    const url = `${location.origin}/${locale}/lists?${q}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(list)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      prompt(d.share, url)
    }
  }

  if (!state.items.length && !state.lists.length) return <p className="muted">{d.none}</p>

  return (
    <div className="stack">
      {[...groups].map(([list, items]) =>
        list === '' && !items.length ? null : (
          <section key={list || 'unsorted'} className="card">
            <div className="section-head">
              <h2>{list || d.unsorted}</h2>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {items.length ? (
                  <button className="btn secondary small" onClick={() => share(list, items)}>
                    {copied === list ? d.copied : d.share}
                  </button>
                ) : null}
                {list ? (
                  <>
                    <button
                      className="btn ghost small"
                      onClick={() => {
                        const name = window.prompt(d.listName, list)?.trim()
                        if (!name || name === list || state.lists.includes(name)) return
                        save({
                          lists: state.lists.map((l) => (l === list ? name : l)),
                          items: state.items.map((b) => (b.list === list ? { ...b, list: name } : b)),
                        })
                      }}
                    >
                      {d.rename}
                    </button>
                    <button
                      className="btn ghost small"
                      onClick={() =>
                        save({ lists: state.lists.filter((l) => l !== list), items: state.items.map((b) => (b.list === list ? { ...b, list: undefined } : b)) })
                      }
                    >
                      {d.delete}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            <ul className="list">
              {items.map((b, index) => (
                <li key={b.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <a className="title" style={{ flex: '1 1 14rem' }} href={`/${locale}${b.href}`}>
                    {b.title}
                  </a>
                  <label className="sr-only" htmlFor={`move-${b.id}`}>
                    {d.moveTo}
                  </label>
                  <select
                    id={`move-${b.id}`}
                    value={b.list ?? ''}
                    style={{ width: 'auto' }}
                    onChange={(e) => save({ ...state, items: state.items.map((x) => (x.id === b.id ? { ...x, list: e.target.value || undefined } : x)) })}
                  >
                    <option value="">{d.unsorted}</option>
                    {state.lists.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn ghost small"
                    aria-label="↑"
                    disabled={index === 0}
                    onClick={() => {
                      const all = [...state.items]
                      const i = all.findIndex((x) => x.id === b.id)
                      const j = all.findIndex((x) => x.id === items[index - 1].id)
                      ;[all[i], all[j]] = [all[j], all[i]]
                      save({ ...state, items: all })
                    }}
                  >
                    ↑
                  </button>
                  <button className="btn ghost small" onClick={() => save({ ...state, items: state.items.filter((x) => x.id !== b.id) })}>
                    {d.remove}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
      <form
        className="searchbox"
        onSubmit={(e) => {
          e.preventDefault()
          createList()
        }}
      >
        <label htmlFor="new-list" className="sr-only">
          {d.listName}
        </label>
        <input id="new-list" type="text" placeholder={d.listName} value={newList} onChange={(e) => setNewList(e.target.value)} maxLength={60} />
        <button className="btn secondary" type="submit">
          {d.newList}
        </button>
      </form>
    </div>
  )
}
