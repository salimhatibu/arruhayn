import { dir, t, type Locale } from '@/i18n/dictionary'
import type { LexicalValue } from '@/lib/lexical'

// The emails are plain HTML with inline styles: mail clients strip stylesheets, and many ignore
// anything clever. Everything stays inside one 600px card so it reads the same everywhere.

const INK = '#24130f'
const MUTED = '#6b5c50'
const WINE = '#6b1f33'
const RULE = '#e5dccc'
const PAPER = '#fffdf8'
const PAGE = '#f3efe6'
const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Only ordinary web links survive into the email; anything else becomes plain text.
const safeUrl = (url: string | undefined) =>
  url && /^(https?:|mailto:)/i.test(url.trim()) ? escape(url.trim()) : null

type Node = {
  type?: string
  tag?: string
  text?: string
  format?: number | string
  listType?: string
  children?: Node[]
  fields?: { url?: string }
  url?: string
}

// Lexical's text formats are a bitmask: 1 bold, 2 italic, 4 strikethrough, 8 underline, 16 code.
function formatText(node: Node): string {
  let html = escape(node.text ?? '')
  const format = typeof node.format === 'number' ? node.format : 0
  if (format & 16) html = `<code style="font-family:monospace">${html}</code>`
  if (format & 4) html = `<s>${html}</s>`
  if (format & 8) html = `<u>${html}</u>`
  if (format & 2) html = `<em>${html}</em>`
  if (format & 1) html = `<strong>${html}</strong>`
  return html
}

function renderNodes(nodes: Node[] | undefined): string {
  if (!nodes?.length) return ''
  return nodes
    .map((node) => {
      if (typeof node.text === 'string') return formatText(node)
      const inner = renderNodes(node.children)
      switch (node.type) {
        case 'linebreak':
          return '<br />'
        case 'heading': {
          const size = node.tag === 'h1' ? 24 : node.tag === 'h2' ? 20 : 17
          return `<h2 style="margin:28px 0 10px;font-family:${SERIF};font-size:${size}px;line-height:1.3;color:${INK}">${inner}</h2>`
        }
        case 'quote':
          return `<blockquote style="margin:20px 0;padding:2px 16px;border-inline-start:3px solid ${RULE};color:${MUTED};font-family:${SERIF};font-style:italic">${inner}</blockquote>`
        case 'list': {
          const tag = node.listType === 'number' ? 'ol' : 'ul'
          return `<${tag} style="margin:14px 0;padding-inline-start:22px;color:${INK}">${inner}</${tag}>`
        }
        case 'listitem':
          return `<li style="margin:6px 0;line-height:1.65">${inner}</li>`
        case 'link':
        case 'autolink': {
          const href = safeUrl(node.fields?.url ?? node.url)
          return href ? `<a href="${href}" style="color:${WINE}">${inner}</a>` : inner
        }
        case 'paragraph':
          return inner.trim()
            ? `<p style="margin:14px 0;font-size:16px;line-height:1.7;color:${INK}">${inner}</p>`
            : ''
        default:
          return inner
      }
    })
    .join('')
}

export function lexicalToEmailHtml(value: LexicalValue): string {
  return renderNodes((value as { root?: Node } | null | undefined)?.root?.children)
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0"><tr><td style="border-radius:8px;background:${INK}">
      <a href="${escape(href)}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:#fffdf8;text-decoration:none">${escape(label)}</a>
    </td></tr></table>`
}

function layout({
  locale,
  title,
  kicker,
  body,
  footer,
}: {
  locale: Locale
  title: string
  kicker?: string
  body: string
  footer: string
}): string {
  const rtl = dir(locale) === 'rtl'
  const align = rtl ? 'right' : 'left'
  return `<!doctype html>
<html lang="${locale}" dir="${dir(locale)}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:${PAGE}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(kicker ?? title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${PAPER};border:1px solid ${RULE};border-radius:14px">
        <tr><td style="padding:30px 32px 0;text-align:${align}">
          <div style="font-family:${SERIF};font-size:26px;color:${INK}" dir="rtl">الرُّحَين</div>
          <div style="margin-top:4px;font-family:${SANS};font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${MUTED}">Arruhayn</div>
        </td></tr>
        <tr><td style="padding:22px 32px 0"><hr style="border:0;border-top:1px solid ${RULE};margin:0" /></td></tr>
        <tr><td style="padding:4px 32px 30px;text-align:${align}">
          ${kicker ? `<p style="margin:20px 0 6px;font-family:${SANS};font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${WINE}">${escape(kicker)}</p>` : ''}
          <h1 style="margin:${kicker ? '0' : '22px'} 0 14px;font-family:${SERIF};font-size:27px;line-height:1.25;color:${INK}">${escape(title)}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:0 32px 28px;text-align:${align}">
          <hr style="border:0;border-top:1px solid ${RULE};margin:0 0 14px" />
          <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTED}">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const paragraph = (text: string, align: string) =>
  `<p style="margin:14px 0;font-family:${SANS};font-size:16px;line-height:1.7;color:${INK};text-align:${align}">${escape(text)}</p>`

export function confirmEmail({
  locale,
  name,
  confirmUrl,
}: {
  locale: Locale
  name?: string | null
  confirmUrl: string
}): { subject: string; html: string; text: string } {
  const d = t(locale).email
  const align = dir(locale) === 'rtl' ? 'right' : 'left'
  const html = layout({
    locale,
    title: d.confirmHeading,
    body: [
      paragraph(d.greeting(name), align),
      paragraph(d.confirmBody, align),
      button(confirmUrl, d.confirmButton),
      `<p style="margin:14px 0 0;font-family:${SANS};font-size:13px;line-height:1.7;color:${MUTED};text-align:${align}">${escape(d.linkFallback)}<br /><a href="${escape(confirmUrl)}" style="color:${WINE};word-break:break-all">${escape(confirmUrl)}</a></p>`,
    ].join(''),
    footer: escape(d.confirmIgnore),
  })
  const text = [d.greeting(name), '', d.confirmBody, '', `${d.confirmButton}: ${confirmUrl}`, '', d.confirmIgnore].join('\n')
  return { subject: d.confirmSubject, html, text }
}

export function issueEmail({
  locale,
  name,
  issue,
  title,
  summary,
  bodyHtml,
  bodyText,
  readUrl,
  unsubscribeUrl,
}: {
  locale: Locale
  name?: string | null
  issue: number
  title: string
  summary?: string | null
  bodyHtml: string
  bodyText: string
  readUrl: string
  unsubscribeUrl: string
}): { subject: string; html: string; text: string } {
  const d = t(locale).email
  const align = dir(locale) === 'rtl' ? 'right' : 'left'
  const html = layout({
    locale,
    kicker: d.issueKicker(issue),
    title,
    body: [
      summary ? `<p style="margin:0 0 18px;font-family:${SERIF};font-size:17px;line-height:1.6;color:${MUTED};text-align:${align}">${escape(summary)}</p>` : '',
      bodyHtml,
      `<p style="margin:26px 0 0;text-align:${align}"><a href="${escape(readUrl)}" style="font-family:${SANS};font-size:14px;color:${WINE}">${escape(d.readOnline)}</a></p>`,
    ].join(''),
    footer: `${escape(d.why)}<br /><a href="${escape(unsubscribeUrl)}" style="color:${MUTED}">${escape(d.unsubscribe)}</a>`,
  })
  const text = [
    d.greeting(name),
    '',
    `${d.issueKicker(issue)} — ${title}`,
    ...(summary ? ['', summary] : []),
    '',
    bodyText,
    '',
    `${d.readOnline}: ${readUrl}`,
    '',
    d.why,
    `${d.unsubscribe}: ${unsubscribeUrl}`,
  ].join('\n')
  return { subject: d.issueSubject(issue, title), html, text }
}
