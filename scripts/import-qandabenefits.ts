// Imports the marriage fatwas published on qandabenefits.com (used with the site owner's
// permission). Each fatwa keeps its scholar, translator, original source, and a link back to
// Q&A Benefits. Running it again updates the fatwas it imported before instead of duplicating them.
//
//   DRY_RUN=1 pnpm import:qab                                  list what would be imported
//   pnpm import:qab                                            local dev database
//   CLOUDFLARE_ENV=admin NODE_ENV=production pnpm import:qab   production
import config from '@payload-config'
import { JSDOM } from 'jsdom'
import { getPayload } from 'payload'

const API = 'https://qandabenefits.com/wp-json/wp/v2/posts'
const MARRIAGE_CATEGORY = 5
const PUBLISHER = 'Q&A Benefits'
const dryRun = process.env.DRY_RUN === '1'

type Post = { id: number; date: string; link: string; title: { rendered: string }; content: { rendered: string } }

// Posts that are filed under marriage but are about something else, and older copies of posts
// that were published again later.
const SKIP = new Set([
  14, // where the wife stands in prayer
  158, // forbidding evil
  346, // travelling for hijrah
  548, // vows
  650, // praying Fajr at home
  665, // praying Fajr at home (copy)
  2235, // zakah
  3600, // copy of 6296
  3872, // copy of 7664
  3499, // a question about a narration, not about marriage
])

// The first rule that matches is the fatwa's main topic; later matches are added as extra topics.
const RULES: [string, RegExp][] = [
  ['custody', /custod|hadaanah|hadanah/i],
  ['khul', /\bkhul/i],
  ['iddah', /\biddah?\b|4 months and 10|four months and ten|mourning/i],
  ['annulment', /annul|faskh|absent for four years|invalidation of marriage|apostat/i],
  ['talaq', /divorc|talaa?q/i],
  ['polygyny', /second wife|first wife|polyg|to marry a second|taking on a second/i],
  ['invalid-marriages', /zaani|adulter|fornicat|breast ?fe|breastfed|puberty|forced marriage|impermissible in islam|hidden agenda|step ?daughter|mushrik|upon shirk|two brothers|joking/i],
  ['wali', /\bwali(?:yy?)?\b|waliy|guardian|marry off|father (?:is )?(?:prevent|reject)|will of the parents|sultan/i],
  ['mahr', /mahr|dowr/i],
  ['engagement-proposal', /propos|engag|far away|another country|describ|description|religiously committed|poor man|does not work|choose the one/i],
  ['contract', /contract|nikk?ah|conditions of|walimah|wedding|ceremon|procedure of marriage|celebration|stipulat|haraam money|virginity/i],
  ['rights-of-spouses', /wife|husband|spous|marri/i],
]

const document = new JSDOM('').window.document
const decode = (html: string) => {
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}
const clean = (s: string) => s.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim()

// Lexical rich text from the post HTML.

type LexNode = Record<string, unknown>
const base = { format: '', indent: 0, version: 1, direction: null as null }
const FORMAT = { b: 1, strong: 1, i: 2, em: 2, u: 8 } as Record<string, number>

function inline(node: Node, format = 0, out: LexNode[] = []): LexNode[] {
  if (node.nodeType === 3) {
    const text = (node.textContent ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ')
    if (text) out.push({ type: 'text', text, format, style: '', mode: 'normal', detail: 0, version: 1 })
    return out
  }
  if (node.nodeType !== 1) return out
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (tag === 'br') {
    out.push({ type: 'linebreak', version: 1 })
    return out
  }
  if (tag === 'a') {
    const href = el.getAttribute('href') ?? ''
    const children = [...el.childNodes].flatMap((c) => inline(c, format))
    if (/^https?:\/\//.test(href) && children.length) {
      out.push({ ...base, type: 'link', version: 3, fields: { url: href, newTab: true, linkType: 'custom' }, children })
    } else out.push(...children)
    return out
  }
  if (['img', 'iframe', 'script', 'style', 'figure', 'svg'].includes(tag)) return out
  for (const c of el.childNodes) inline(c, format | (FORMAT[tag] ?? 0), out)
  return out
}

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'ul', 'ol', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure'])
const BLOCK_CONTAINERS = new Set(['div', 'section', 'figure'])
const hasBlockChildren = (el: Element) => [...el.children].some((c) => BLOCK_TAGS.has(c.tagName.toLowerCase()))
const flatten = (el: Element): Element[] =>
  BLOCK_CONTAINERS.has(el.tagName.toLowerCase()) && hasBlockChildren(el) ? [...el.children].flatMap(flatten) : [el]

function trimInline(children: LexNode[]) {
  while (children[0]?.type === 'linebreak') children.shift()
  while (children.at(-1)?.type === 'linebreak') children.pop()
  const first = children[0]
  const last = children.at(-1)
  if (first?.type === 'text') first.text = String(first.text).trimStart()
  if (last?.type === 'text') last.text = String(last.text).trimEnd()
  return children.filter((c) => c.type !== 'text' || c.text)
}

function block(el: Element): LexNode[] {
  const tag = el.tagName.toLowerCase()
  if (tag === 'ul' || tag === 'ol') {
    const items = [...el.children]
      .filter((li) => li.tagName.toLowerCase() === 'li')
      .map((li, i) => ({ ...base, type: 'listitem', value: i + 1, children: trimInline(inline(li)) }))
    return items.length
      ? [{ ...base, type: 'list', listType: tag === 'ul' ? 'bullet' : 'number', tag, start: 1, children: items }]
      : []
  }
  if (BLOCK_CONTAINERS.has(tag) && hasBlockChildren(el)) return [...el.children].flatMap(block)
  const children = trimInline(inline(el))
  if (!children.length) return []
  if (tag === 'blockquote') return [{ ...base, type: 'quote', children }]
  if (/^h[1-6]$/.test(tag)) return [{ ...base, type: 'heading', tag: 'h3', children }]
  return [{ ...base, type: 'paragraph', textFormat: 0, textStyle: '', children }]
}

// Splits a post into its question, answer, and credits. Older posts put several parts in one
// paragraph separated by line breaks, so those are split into paragraphs first.

const LABEL = /^(answered by|translat(?:ed|ion)(?: [\w ]{0,40}?)? by|original fatwa|source|question|answer)\b\s*:?\s*([\s\S]*)$/i
const LABEL_AHEAD = '(?=(?:\\s|<[^>]+>|\\?|&nbsp;)*(?:question|answer|answered by|translat(?:ed|ion)(?: [\\w ]{0,40}?)? by|source|original fatwa)\\b)'

function parse(post: Post) {
  const html = post.content.rendered
    .split('<div class="ays-arp-under-posts-container')[0]
    .replace(/(?:<br[^>]*>\s*){2,}/gi, '</p><p>')
    .replace(new RegExp(`<br[^>]*>${LABEL_AHEAD}`, 'gi'), '</p><p>')
  const root = document.createElement('div')
  root.innerHTML = html
  root.querySelectorAll('style, script, noscript, .sharedaddy, hr').forEach((e) => e.remove())

  const intro: Element[] = []
  const question: string[] = []
  const answer: Element[] = []
  let scholar = ''
  let translator = ''
  let source: { reference: string; url?: string } | null = null
  let mode: 'intro' | 'question' | 'answer' | 'credits' = 'intro'

  const blocks = [...root.children].flatMap(flatten)
  for (const el of blocks) {
    const raw = clean(el.textContent ?? '')
    const text = raw.replace(/^[^\p{L}\p{N}"“(]+/u, '')
    if (!text || /^بس+م/.test(text) || /subscribe/i.test(text)) continue
    const label = text.match(LABEL)
    const key = label?.[1].toLowerCase().replace(/^translat.*/, 'translated by')
    const rest = clean(label?.[2] ?? '').replace(/\s+/g, ' ').replace(/^\d+\s*:\s*/, '')
    if (key === 'question' || key === 'answer') {
      mode = key
      if (rest && key === 'question') question.push(rest)
      else if (rest) {
        const p = document.createElement('p')
        p.textContent = rest
        answer.push(p)
      }
      continue
    }
    if (key === 'answered by') {
      scholar = rest
      continue
    }
    if (key === 'translated by') {
      translator = rest
      mode = mode === 'answer' ? 'credits' : mode
      continue
    }
    if (key === 'source' || key === 'original fatwa') {
      const href = el.querySelector('a')?.getAttribute('href') ?? (rest.match(/(?:https?:\/\/)?t\.me\/\S+/)?.[0] ?? '')
      const url = href ? (href.startsWith('http') ? href : `https://${href}`) : undefined
      source = { reference: url && rest.includes(url.replace(/^https:\/\//, '')) ? 'Original fatwa' : rest || 'Original fatwa', url }
      mode = mode === 'answer' ? 'credits' : mode
      continue
    }
    // A closing signature such as "– Shaykh Abu Amr al-Hajooree".
    const signature = raw.match(/^[–—-]\s*((?:shaykh|shaikh|sheikh|imam|al-?imam)\b.*)$/i)
    if (signature && mode === 'answer') {
      scholar ||= clean(signature[1])
      continue
    }
    if (mode === 'question') question.push(text)
    else if (mode === 'answer') answer.push(el)
    else if (mode === 'intro') intro.push(el)
  }

  const title = decode(post.title.rendered)
  return {
    title,
    question: question.join('\n\n') || title,
    answer: { root: { ...base, type: 'root', children: (answer.length ? answer : intro).flatMap(block) } },
    scholar: scholarName(scholar),
    translator: translator.replace(/[:.]\s*$/, '').trim(),
    source,
  }
}

// Scholars appear under several spellings and with honorifics; these give one name each.
const SCHOLARS: [RegExp, string][] = [
  [/yahya.*haj|haj.*yahya|^our shaykh, the ['‘]all/i, 'Shaykh Yahya ibn ʿAli al-Hajuri'],
  [/abdul hameed al haj/i, 'Shaykh ʿAbd al-Hamid al-Hajuri'],
  [/abu amr al haj/i, 'Shaykh Abu ʿAmr al-Hajuri'],
  [/ab[uū] bil[aā]+l|ḥaḍram|hadhram|hadram/i, 'Shaykh Abu Bilal al-Hadrami'],
  [/ba shu|bashu/i, 'Shaykh Abu Hamzah Hasan Ba Shuʿayb'],
  [/inaabi|jaza/i, 'Shaykh Abu Hatim Yusuf al-Jazaʾiri'],
  [/ba ?jamaa?l/i, 'Shaykh Muhammad Ba Jamal'],
  [/qaise+|qayse+/i, 'Shaykh Abu Ishaq al-Qaysi'],
  [/[ai]ry?aa?ni/i, 'Shaykh ʿAbdullah al-Iryani'],
  [/ibn baaz/i, 'Imam Ibn Baz'],
  [/fath al qad/i, 'Shaykh Fathi al-Qadasi'],
  [/rash[aā]d/i, 'Shaykh Rashad al-Dhaliʿi'],
  [/al mani/i, 'Shaykh Muhammad al-Maniʿ'],
]

function scholarName(raw: string) {
  const name = raw
    .replace(/\s*[–—-]\s*may all[aā]+h.*$/i, '')
    .replace(/\s*[(\[][^)\]]*(?:all[aā]+h|hafidh|rahim|preserve)[^)\]]*[)\]]\s*/gi, ' ')
    .replace(/\s*(?:hafidhahullaa?h|rahimahullaa?h)\s*/gi, ' ')
    .replace(/^(?:the )?noble (?:brother )?/i, '')
    .replace(/[:.]\s*$/, '')
    .trim()
  return SCHOLARS.find(([re]) => re.test(name))?.[1] ?? name
}

// Fatwas whose wording leads the keyword rules to the wrong topic.
const TOPIC_OVERRIDES: Record<number, string[]> = {
  24: ['rights-of-spouses'],
  781: ['rights-of-spouses'],
  3749: ['contract'],
  3834: ['talaq'],
  4243: ['rights-of-spouses', 'polygyny'],
  7952: ['wali'],
}

function topicsFor(text: string) {
  const found = RULES.filter(([, re]) => re.test(text)).map(([slug]) => slug)
  return [...new Set(found)].slice(0, 2)
}

async function fetchPosts(): Promise<Post[]> {
  const posts: Post[] = []
  for (let page = 1; ; page++) {
    const res = await fetch(
      `${API}?categories=${MARRIAGE_CATEGORY}&per_page=50&page=${page}&_fields=id,date,link,title,content`,
    )
    if (!res.ok) break
    const batch = (await res.json()) as Post[]
    posts.push(...batch)
    if (batch.length < 50) break
  }
  return posts
}

const posts = (await fetchPosts()).filter((p) => !SKIP.has(p.id)).sort((a, b) => a.date.localeCompare(b.date))
const parsed = posts.map((p) => ({ post: p, ...parse(p) }))
for (const f of parsed) f.title = f.title.replace(/\s+/g, ' ')

if (dryRun) {
  for (const f of parsed) {
    const topics = TOPIC_OVERRIDES[f.post.id] ?? topicsFor(`${f.title} ${f.question}`)
    console.log(`${f.post.id}\t${topics.join(',') || 'NONE'}\t${f.scholar || '-'}\t${f.answer.root.children.length}p\t${f.title}`)
  }
  console.log(`${parsed.length} fatwas`)
  process.exit(0)
}

const payload = await getPayload({ config })

const topicDocs = await payload.find({ collection: 'topics', pagination: false, depth: 0 })
const topicId = new Map(topicDocs.docs.map((t) => [t.slug, t.id]))
const scholarId = new Map<string, number>()
const scholarKey = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '').replace(/^(shaykh|shaikh|sheikh)/, '')

const existingScholars = await payload.find({ collection: 'scholars', pagination: false, depth: 0, locale: 'en' })
for (const s of existingScholars.docs) scholarId.set(scholarKey(s.name), s.id)

let created = 0
let updated = 0
for (const f of parsed) {
  const slugs = TOPIC_OVERRIDES[f.post.id] ?? topicsFor(`${f.title} ${f.question}`)
  const topics = slugs.map((s) => topicId.get(s)).filter((id): id is number => typeof id === 'number')
  if (!topics.length) {
    payload.logger.warn(`Skipped ${f.post.link}: no topic matched`)
    continue
  }
  let scholar: number | undefined
  if (f.scholar) {
    const key = scholarKey(f.scholar)
    if (!scholarId.has(key)) {
      const doc = await payload.create({ collection: 'scholars', locale: 'en', data: { name: f.scholar } })
      scholarId.set(key, doc.id)
    }
    scholar = scholarId.get(key)
  }
  const data = {
    title: f.title,
    question: f.question,
    answer: f.answer as never,
    topics,
    scholar,
    translatedBy: f.translator || undefined,
    sources: f.source ? [f.source] : [],
    originalUrl: f.post.link,
    publishedBy: PUBLISHER,
    status: 'published' as const,
    publishedAt: new Date(f.post.date).toISOString(),
  }
  const existing = await payload.find({
    collection: 'fatwas',
    where: { originalUrl: { equals: f.post.link } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs[0]) {
    await payload.update({ collection: 'fatwas', id: existing.docs[0].id, locale: 'en', data })
    updated++
  } else {
    await payload.create({ collection: 'fatwas', locale: 'en', data })
    created++
  }
}

payload.logger.info(`Imported ${created} new and updated ${updated} fatwas from ${PUBLISHER}`)
process.exit(0)
