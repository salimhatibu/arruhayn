'use client'

import { useEffect, useRef, useState } from 'react'

import { t, type Locale } from '@/i18n/dictionary'

import { Icon } from './Icon'

// Shares a page. Phones and some browsers open their own share sheet; elsewhere a small menu
// offers the common apps and copying the link.

export function ShareButton({
  title,
  path,
  locale,
  compact = false,
}: {
  title: string
  path: string
  locale: Locale
  compact?: boolean
}) {
  const d = t(locale).share
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const url = () => new URL(path, window.location.origin).toString()

  async function share() {
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title, url: url() }).catch(() => {})
      return
    }
    setOpen((o) => !o)
  }

  async function copy() {
    await navigator.clipboard?.writeText(url()).catch(() => {})
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setOpen(false)
    }, 1400)
  }

  const links = () => {
    const u = encodeURIComponent(url())
    const text = encodeURIComponent(title)
    return [
      ['WhatsApp', `https://wa.me/?text=${text}%20${u}`],
      ['Telegram', `https://t.me/share/url?url=${u}&text=${text}`],
      ['X', `https://x.com/intent/post?url=${u}&text=${text}`],
      ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
      [d.email, `mailto:?subject=${text}&body=${u}`],
    ]
  }

  return (
    <div className="share" ref={box}>
      <button
        type="button"
        className={compact ? 'share-icon' : 'btn secondary small'}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={compact ? `${d.label}: ${title}` : undefined}
        onClick={share}
      >
        <Icon name="send" size={compact ? 18 : 15} />
        {compact ? null : d.label}
      </button>
      {open ? (
        <div className="share-menu" role="menu">
          <button type="button" role="menuitem" onClick={copy}>
            {copied ? d.copied : d.copy}
          </button>
          {links().map(([name, href]) => (
            <a key={name} role="menuitem" href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              {name}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  )
}
