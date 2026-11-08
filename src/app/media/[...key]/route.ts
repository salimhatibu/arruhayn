import { getCloudflareContext } from '@opennextjs/cloudflare'

// Serves images and recordings from R2, with Range support so audio can seek.
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params
  const key = parts.map(decodeURIComponent).join('/')
  if (!key || key.includes('..')) return new Response('Not found', { status: 404 })
  const { env } = await getCloudflareContext({ async: true })

  // Byte ranges let audio seek. A range outside the file gets 416 with the file's size, as the
  // HTTP spec asks; anything that isn't a single bytes range is ignored and the whole file sent.
  const range = request.headers.get('range')
  const match = range?.match(/^bytes=(\d*)-(\d*)$/)
  let r2Range: { offset: number; length: number } | undefined
  if (match && (match[1] || match[2])) {
    const head = await env.R2.head(key)
    if (!head) return new Response('Not found', { status: 404 })
    const size = head.size
    const [, start, end] = match
    let offset: number
    let last: number
    if (start) {
      offset = Number(start)
      last = end ? Math.min(Number(end), size - 1) : size - 1
    } else {
      const suffix = Number(end)
      offset = Math.max(0, size - suffix)
      last = size - 1
      if (suffix === 0) offset = size
    }
    if (offset >= size || offset > last) {
      return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } })
    }
    r2Range = { offset, length: last - offset + 1 }
  }

  const object = await env.R2.get(key, r2Range ? { range: r2Range } : undefined)
  if (!object) return new Response('Not found', { status: 404 })

  // Set from the stored metadata directly: writeHttpMetadata can't cross the local dev proxy.
  const headers = new Headers()
  const meta = object.httpMetadata
  if (meta?.contentType) headers.set('content-type', meta.contentType)
  if (meta?.contentDisposition) headers.set('content-disposition', meta.contentDisposition)
  if (meta?.contentLanguage) headers.set('content-language', meta.contentLanguage)
  headers.set('etag', object.httpEtag)
  headers.set('accept-ranges', 'bytes')
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  if (r2Range && 'body' in object) {
    headers.set('content-range', `bytes ${r2Range.offset}-${r2Range.offset + r2Range.length - 1}/${object.size}`)
    headers.set('content-length', String(r2Range.length))
    return new Response(object.body, { status: 206, headers })
  }
  headers.set('content-length', String(object.size))
  return new Response('body' in object ? object.body : null, { headers })
}
