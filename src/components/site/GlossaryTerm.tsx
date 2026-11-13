'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

// A glossary term inside article text. A mouse opens it on hover; a tap, click, or Enter pins it
// open. Escape or a click elsewhere closes it.
export function GlossaryTerm({ term, definition, children }: { term: string; definition: string; children: ReactNode }) {
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hover || pinned
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = () => {
      setHover(false)
      setPinned(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close()
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
    <span
      ref={ref}
      style={{ position: 'relative' }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(false)}
    >
      <button type="button" className="gloss" aria-expanded={open} aria-describedby={open ? id : undefined} onClick={() => setPinned((p) => !p)}>
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
