import type { ReactNode } from 'react'

import type { Glossary } from '@/payload-types'
import type { LexicalValue } from '@/lib/lexical'

import { GlossaryTerm } from './GlossaryTerm'

// Renders Payload's Lexical rich text. The first mention of each glossary term (or one of its
// other spellings) becomes a button that shows the definition.

type Node = {
  type?: string
  text?: string
  format?: number | string
  tag?: string
  listType?: string
  children?: Node[]
  fields?: { url?: string; newTab?: boolean }
  url?: string
  value?: { url?: string; alt?: string } | number
}

type Term = { pattern: string; term: string; definition: string; id: number }

function buildMatcher(glossary: Glossary[] | undefined) {
  if (!glossary?.length) return null
  const terms: Term[] = []
  for (const g of glossary) {
    for (const word of [g.term, ...(g.spellings ?? [])]) {
      if (word && word.length > 2) terms.push({ pattern: word, term: g.term, definition: g.definition, id: g.id })
    }
  }
  terms.sort((a, b) => b.pattern.length - a.pattern.length)
  const escaped = terms.map((t) => t.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(?<![\\p{L}\\p{M}])(${escaped.join('|')})(?![\\p{L}\\p{M}])`, 'giu')
  const byPattern = new Map(terms.map((t) => [t.pattern.toLowerCase(), t]))
  return { regex, byPattern }
}

export function RichText({
  value,
  glossary,
  className = 'prose',
}: {
  value: LexicalValue | unknown
  glossary?: Glossary[]
  className?: string
}) {
  const root = (value as LexicalValue)?.root as Node | undefined
  if (!root?.children?.length) return null
  const matcher = buildMatcher(glossary)
  const used = new Set<number>()

  const linkify = (text: string, key: string): ReactNode => {
    if (!matcher) return text
    const parts: ReactNode[] = []
    let last = 0
    for (const m of text.matchAll(matcher.regex)) {
      const term = matcher.byPattern.get(m[0].toLowerCase())
      if (!term || used.has(term.id) || m.index === undefined) continue
      used.add(term.id)
      parts.push(text.slice(last, m.index))
      parts.push(
        <GlossaryTerm key={`${key}-g${m.index}`} term={term.term} definition={term.definition}>
          {m[0]}
        </GlossaryTerm>,
      )
      last = m.index + m[0].length
    }
    if (!parts.length) return text
    parts.push(text.slice(last))
    return parts
  }

  const render = (node: Node, key: string): ReactNode => {
    const kids = () => node.children?.map((c, i) => render(c, `${key}-${i}`))
    switch (node.type) {
      case 'text': {
        const f = typeof node.format === 'number' ? node.format : 0
        let el: ReactNode = linkify(node.text ?? '', key)
        if (f & 16) el = <code>{node.text}</code>
        if (f & 1) el = <strong>{el}</strong>
        if (f & 2) el = <em>{el}</em>
        if (f & 8) el = <u>{el}</u>
        if (f & 4) el = <s>{el}</s>
        if (f & 32) el = <sub>{el}</sub>
        if (f & 64) el = <sup>{el}</sup>
        return <span key={key}>{el}</span>
      }
      case 'linebreak':
        return <br key={key} />
      case 'paragraph':
        return <p key={key}>{kids()}</p>
      case 'heading': {
        const Tag = (['h2', 'h3', 'h4'].includes(node.tag ?? '') ? node.tag : 'h3') as 'h2' | 'h3' | 'h4'
        return <Tag key={key}>{kids()}</Tag>
      }
      case 'quote':
        return <blockquote key={key}>{kids()}</blockquote>
      case 'list':
        return node.listType === 'number' ? <ol key={key}>{kids()}</ol> : <ul key={key}>{kids()}</ul>
      case 'listitem':
        return <li key={key}>{kids()}</li>
      case 'link':
      case 'autolink': {
        const href = node.fields?.url ?? node.url ?? '#'
        const external = /^https?:/.test(href)
        return (
          <a key={key} href={href} {...(external || node.fields?.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {kids()}
          </a>
        )
      }
      case 'horizontalrule':
        return <hr key={key} />
      case 'upload': {
        const media = typeof node.value === 'object' ? node.value : undefined
        // eslint-disable-next-line @next/next/no-img-element
        return media?.url ? <img key={key} src={media.url} alt={media.alt ?? ''} loading="lazy" /> : null
      }
      default:
        return node.children ? <span key={key}>{kids()}</span> : null
    }
  }

  return <div className={className}>{root.children.map((c, i) => render(c, String(i)))}</div>
}
