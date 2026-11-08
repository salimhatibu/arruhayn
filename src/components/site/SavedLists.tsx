'use client'

import { useEffect, useMemo, useState } from 'react'

import { t, type Locale } from '@/i18n/dictionary'
import { formatDate } from '@/lib/format'
import { onBookmarksChange, readBookmarks, writeBookmarks, type Bookmark, type BookmarkState } from '@/lib/bookmarks'

import { Icon } from './Icon'

// The visitor's bookmarks, newest first, and the named lists they made. Lists are created first;
// then each saved item can be added to one. Everything stays in this browser.
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

  const newest = useMemo(() => [...state.items].sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [state.items])
  const inList = (list: string) => newest.filter((b) => b.list === list)

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
    const q = new URLSearchParams({ items: items.map((i) => i.id).join(','), name: list || d.allSaved })
    const url = `${location.origin}/${locale}/lists?${q}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(list)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      prompt(d.share, url)
    }
  }

  const shareButton = (list: string, items: Bookmark[]) =>
    items.length ? (
      <button className="btn secondary small" onClick={() => share(list, items)}>
        <Icon name="send" size={14} />
        {copied === list ? d.copied : d.share}
      </button>
    ) : null

  return (
    <div className="saved">
      <section className="saved-lists">
        <div className="section-head">
          <h2>{d.yourLists}</h2>
        </div>
        <p className="help">{d.listsHint}</p>
        <form
          className="saved-new"
          onSubmit={(e) => {
            e.preventDefault()
            createList()
          }}
        >
          <label htmlFor="new-list" className="sr-only">
            {d.listName}
          </label>
          <input id="new-list" type="text" placeholder={d.listName} value={newList} onChange={(e) => setNewList(e.target.value)} maxLength={60} />
          <button className="btn" type="submit" disabled={!newList.trim()}>
            {d.newList}
          </button>
        </form>

        {state.lists.map((list) => {
          const items = inList(list)
          return (
            <section key={list} className="card saved-list">
              <div className="section-head">
                <h3>{list}</h3>
                <div className="saved-actions">
                  {shareButton(list, items)}
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
                </div>
              </div>
              {items.length ? (
                <ul className="list">
                  {items.map((b) => (
                    <li key={b.id} className="saved-item">
                      <a className="title" href={`/${locale}${b.href}`} dir="auto">
                        {b.title}
                      </a>
                      <button className="btn ghost small" onClick={() => save({ ...state, items: state.items.map((x) => (x.id === b.id ? { ...x, list: undefined } : x)) })}>
                        {d.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">{d.emptyList}</p>
              )}
            </section>
          )
        })}
      </section>

      <section className="saved-all">
        <div className="section-head">
          <h2>{d.allSaved}</h2>
          <div className="saved-actions">
            <span className="muted small">{d.newestFirst}</span>
            {shareButton('', newest)}
          </div>
        </div>
        {newest.length ? (
          <ul className="list">
            {newest.map((b) => (
              <li key={b.id} className="saved-item">
                <span className="saved-item-text">
                  <a className="title" href={`/${locale}${b.href}`} dir="auto">
                    {b.title}
                  </a>
                  <span className="meta">
                    {d.savedOn} {formatDate(b.savedAt, locale)}
                  </span>
                </span>
                {state.lists.length ? (
                  <>
                    <label className="sr-only" htmlFor={`list-${b.id}`}>
                      {d.addToList}
                    </label>
                    <select
                      id={`list-${b.id}`}
                      value={b.list && state.lists.includes(b.list) ? b.list : ''}
                      onChange={(e) => save({ ...state, items: state.items.map((x) => (x.id === b.id ? { ...x, list: e.target.value || undefined } : x)) })}
                    >
                      <option value="">{b.list ? d.notInList : d.addToList}</option>
                      {state.lists.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
                <button className="btn ghost small" onClick={() => save({ ...state, items: state.items.filter((x) => x.id !== b.id) })}>
                  {d.remove}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{d.none}</p>
        )}
      </section>
    </div>
  )
}
