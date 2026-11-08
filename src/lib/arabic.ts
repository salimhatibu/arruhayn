// Text normalization for search, so the same word matches with or without diacritics
// and across common spelling variants.

export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[ً-ٰٟۖ-ۭ]/g, '') // tashkeel and Qur'anic marks
    .replace(/ـ/g, '') // tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
}

export function words(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1)
}

// Builds an FTS5 MATCH expression. Every query word must appear (as a prefix); a word can also be
// matched by any of its synonyms, for example "dowry" also matches "mahr".
export function buildMatchQuery(query: string, synonyms: Map<string, string[]> = new Map()): string {
  // Single words match as a prefix; multi-word synonyms match as an exact phrase.
  const quote = (term: string) => {
    const parts = words(term)
    const phrase = `"${parts.join(' ').replace(/"/g, '""')}"`
    return parts.length > 1 ? phrase : `${phrase}*`
  }
  return words(query)
    .slice(0, 12)
    .map((w) => {
      const alternatives = [...new Set([w, ...(synonyms.get(w) ?? [])].map((a) => normalize(a)))]
      return alternatives.length > 1 ? `(${alternatives.map(quote).join(' OR ')})` : quote(w)
    })
    .join(' AND ')
}
