import { sql } from '@payloadcms/db-d1-sqlite'
import type { Payload } from 'payload'

import { buildMatchQuery, normalize } from './arabic'
import { lexicalToText, type LexicalValue } from './lexical'

// Full-text search over fatwas and newsletters, kept in the `search_index` FTS5 table.
// Text is normalized before it's stored and before it's searched, so diacritics and letter
// variants don't affect matches.

export type SearchType = 'fatwa' | 'newsletter'
export type Locale = 'en' | 'ar'
type Localized<T> = Partial<Record<Locale, T>> | T | null | undefined

const pick = <T>(value: Localized<T>, locale: Locale): T | undefined =>
  value && typeof value === 'object' && ('en' in (value as object) || 'ar' in (value as object))
    ? (value as Record<Locale, T>)[locale]
    : (value as T | undefined)

// D1's Drizzle instance; Payload types it loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (payload: Payload) => payload.db.drizzle as any

export async function removeFromIndex(payload: Payload, type: SearchType, id: number | string) {
  await db(payload).run(sql`DELETE FROM search_index WHERE type = ${type} AND ref_id = ${String(id)}`)
}

async function writeEntries(
  payload: Payload,
  type: SearchType,
  id: number | string,
  entries: { locale: Locale; title: string; body: string; keywords?: string }[],
) {
  await removeFromIndex(payload, type, id)
  for (const e of entries) {
    if (!e.title && !e.body) continue
    await db(payload).run(
      sql`INSERT INTO search_index (type, ref_id, locale, title, body, keywords) VALUES (${type}, ${String(id)}, ${e.locale}, ${normalize(e.title)}, ${normalize(e.body)}, ${normalize(e.keywords ?? '')})`,
    )
  }
}

export async function indexFatwa(payload: Payload, id: number | string) {
  const doc = await payload.findByID({ collection: 'fatwas', id, locale: 'all', depth: 1, overrideAccess: true })
  if (!doc || doc.status !== 'published') return removeFromIndex(payload, 'fatwa', id)
  const topics = (doc.topics ?? []).filter((t) => typeof t === 'object')
  const entries = (['en', 'ar'] as const).map((locale) => {
    const topicWords = topics.flatMap((t) => [pick(t.name as Localized<string>, locale) ?? '', ...(t.searchWords ?? [])])
    return {
      locale,
      title: pick(doc.title as Localized<string>, locale) ?? '',
      body: [pick(doc.question as Localized<string>, locale) ?? '', lexicalToText(pick(doc.answer as Localized<LexicalValue>, locale))].join('\n'),
      // Topic names and search words, so "dowry" finds every mahr fatwa. Not shown in snippets.
      keywords: topicWords.join(' '),
    }
  })
  await writeEntries(payload, 'fatwa', id, entries)
}

export async function indexNewsletter(payload: Payload, id: number | string) {
  const doc = await payload.findByID({ collection: 'newsletters', id, locale: 'all', depth: 0, overrideAccess: true })
  if (!doc || doc.status !== 'published') return removeFromIndex(payload, 'newsletter', id)
  const entries = (['en', 'ar'] as const).map((locale) => ({
    locale,
    title: pick(doc.title as Localized<string>, locale) ?? '',
    body: [pick(doc.summary as Localized<string>, locale) ?? '', lexicalToText(pick(doc.body as Localized<LexicalValue>, locale))].join('\n'),
  }))
  await writeEntries(payload, 'newsletter', id, entries)
}

// Maps each topic search word to the other words of the same topic, so "dowry" also finds "mahr".
export async function topicSynonyms(payload: Payload): Promise<Map<string, string[]>> {
  const topics = await payload.find({ collection: 'topics', limit: 100, depth: 0, locale: 'all' })
  const map = new Map<string, string[]>()
  for (const t of topics.docs) {
    const names = Object.values((t.name ?? {}) as Record<string, string>)
    const group = [...names, ...(t.searchWords ?? [])].map(normalize).filter(Boolean)
    for (const word of group) {
      if (word.includes(' ')) continue
      map.set(word, [...new Set([...(map.get(word) ?? []), ...group.filter((g) => g !== word)])])
    }
  }
  return map
}

export type SearchHit = { type: SearchType; id: number; snippet: string }

export async function search(
  payload: Payload,
  query: string,
  locale: Locale,
  opts: { type?: SearchType; limit?: number; offset?: number } = {},
): Promise<SearchHit[]> {
  const match = buildMatchQuery(query, await topicSynonyms(payload))
  if (!match) return []
  const typeFilter = opts.type ? sql` AND type = ${opts.type}` : sql``
  const rows: { type: SearchType; ref_id: string; snip: string }[] = await db(payload).all(
    sql`SELECT type, ref_id, snippet(search_index, 4, '[[', ']]', '…', 24) AS snip
        FROM search_index
        WHERE search_index MATCH ${match} AND locale = ${locale}${typeFilter}
        ORDER BY bm25(search_index, 0, 0, 0, 4.0, 1.0, 0.5)
        LIMIT ${opts.limit ?? 20} OFFSET ${opts.offset ?? 0}`,
  )
  return rows.map((r) => ({ type: r.type, id: Number(r.ref_id), snippet: r.snip }))
}
