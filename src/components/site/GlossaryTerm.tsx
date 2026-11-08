'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

// A glossary term inside article text. Opens on hover, tap, or Enter, and closes with Escape.
export function GlossaryTerm({ term, definition, children }: { term: string; definition: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [open])

  const lang = typeof document !== 'undefined' ? document.documentElement.lang : 'en'
  const slug = encodeURIComponent(term)

  return (
    <span ref={ref} style={{ position: 'relative' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="gloss" aria-expanded={open} aria-describedby={open ? id : undefined} onClick={() => setOpen((o) => !o)}>
        {children}
      </button>
      {open ? (
        <span role="tooltip" id={id} className="gloss-pop" style={{ insetInlineStart: 0, top: '100%' }}>
          <strong>{term}</strong>
          {definition}{' '}
          <a href={`/${lang}/glossary#${slug}`}>→</a>
        </span>
      ) : null}
    </span>
  )
}
