import { getCloudflareContext } from '@opennextjs/cloudflare'

// Serves images and recordings from R2, with Range support so audio can seek.
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params
  const key = parts.map(decodeURIComponent).join('/')
  if (!key || key.includes('..')) return new Response('Not found', { status: 404 })
  const { env } = await getCloudflareContext({ async: true })

  const range = request.headers.get('range')
  let r2Range: R2Range | undefined
  const match = range?.match(/^bytes=(\d*)-(\d*)$/)
  if (match) {
    const [, start, end] = match
    if (start && end) r2Range = { offset: Number(start), length: Number(end) - Number(start) + 1 }
    else if (start) r2Range = { offset: Number(start) }
    else if (end) r2Range = { suffix: Number(end) }
  }

  const object = await env.R2.get(key, r2Range ? { range: r2Range } : undefined)
  if (!object) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('accept-ranges', 'bytes')
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  if (r2Range && 'body' in object) {
    const offset = 'offset' in r2Range && r2Range.offset !== undefined ? r2Range.offset : object.size - (r2Range as { suffix: number }).suffix
    const length = 'length' in r2Range && r2Range.length !== undefined ? r2Range.length : object.size - offset
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`)
    headers.set('content-length', String(length))
    return new Response(object.body, { status: 206, headers })
  }
  headers.set('content-length', String(object.size))
  return new Response('body' in object ? object.body : null, { headers })
}
