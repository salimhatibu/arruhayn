// Helpers for Lexical rich text stored by Payload.

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }
export type LexicalValue = { root?: LexicalNode } | null | undefined

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'quote', 'listitem'])

export function lexicalToText(value: LexicalValue): string {
  const out: string[] = []
  const walk = (node: LexicalNode | undefined) => {
    if (!node) return
    if (typeof node.text === 'string') out.push(node.text)
    if (node.type === 'linebreak') out.push('\n')
    node.children?.forEach(walk)
    if (node.type && BLOCK_TYPES.has(node.type)) out.push('\n')
  }
  walk(value?.root)
  return out.join('').replace(/\n{3,}/g, '\n\n').trim()
}

export function excerpt(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : max) + '…'
}

// Builds a simple Lexical document from plain paragraphs, used when seeding and creating drafts.
export function textToLexical(text: string) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: null as null,
      children: paragraphs.map((p) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: null as null,
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', text: p, format: 0, style: '', mode: 'normal', detail: 0, version: 1 }],
      })),
    },
  }
}
