import { getCloudflareContext } from '@opennextjs/cloudflare'

import { hasRole } from '@/access/roles'
import { errorJson, staffUser } from '@/lib/staff'

const CONTENT_TYPES = new Set(['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/opus', 'audio/wav', 'audio/webm'])
const MAX_PARTS = 10_000

// R2 refuses a body whose length it cannot see, and the stream this route is handed has lost the
// one the browser sent. Rebuilding it around Content-Length keeps the upload streaming; without
// that header there is nothing to rebuild from, so the body is read into memory instead.
async function sizedBody(request: Request): Promise<ReadableStream | ArrayBuffer | null> {
  if (!request.body) return null
  const declared = Number(request.headers.get('content-length'))
  // FixedLengthStream belongs to the Workers runtime; `next dev` runs this in Node, where the
  // body is read into memory instead. Parts are 8 MB, so that costs little.
  if (typeof FixedLengthStream !== 'undefined' && Number.isInteger(declared) && declared > 0) {
    const fixed = new FixedLengthStream(declared)
    // Deliberately not awaited: this pipe fills the stream while R2 drains the other half.
    void request.body.pipeTo(fixed.writable).catch(() => {})
    return fixed.readable
  }
  return await request.arrayBuffer()
}

function uploadIdFrom(url: URL) {
  const uploadId = url.searchParams.get('uploadId') ?? ''
  return uploadId.length > 0 && uploadId.length <= 2048 ? uploadId : null
}

async function handle(request: Request) {
  try {
    const user = await staffUser(request)
    if (!user || !hasRole(user, 'admin', 'teacher')) return errorJson('Sign in as a teacher to upload.', 401)
    const url = new URL(request.url)
    const key = url.searchParams.get('key') ?? ''
    if (!/^recordings\/[\w.-]+$/.test(key)) return errorJson('Invalid upload key.', 400)
    const { env } = await getCloudflareContext({ async: true })
    const action = url.searchParams.get('action')

    if (action === 'create' && request.method === 'POST') {
      const body = (await request.json().catch((): null => null)) as { contentType?: string } | null
      if (!body?.contentType || !CONTENT_TYPES.has(body.contentType)) return errorJson('Unsupported audio type.', 400)
      const upload = await env.R2.createMultipartUpload(key, {
        httpMetadata: { contentType: body.contentType },
      })
      return Response.json({ uploadId: upload.uploadId })
    }

    const uploadId = uploadIdFrom(url)
    if (action === 'part' && request.method === 'PUT') {
      const partNumber = Number(url.searchParams.get('partNumber'))
      if (!uploadId || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > MAX_PARTS) {
        return errorJson('Invalid multipart upload part.', 400)
      }
      const partBody = await sizedBody(request)
      if (!partBody) return errorJson('The upload part was empty.', 400)
      const part = await env.R2.resumeMultipartUpload(key, uploadId).uploadPart(partNumber, partBody)
      return Response.json(part)
    }

    if (action === 'complete' && request.method === 'POST') {
      if (!uploadId) return errorJson('Invalid multipart upload.', 400)
      const body = (await request.json().catch((): null => null)) as { parts?: R2UploadedPart[] } | null
      const parts = body?.parts
      if (
        !Array.isArray(parts) ||
        parts.length === 0 ||
        parts.length > MAX_PARTS ||
        parts.some((part, index) =>
          !part ||
          !Number.isInteger(part.partNumber) ||
          part.partNumber !== index + 1 ||
          typeof part.etag !== 'string' ||
          !part.etag,
        )
      ) {
        return errorJson('Invalid multipart upload parts.', 400)
      }
      await env.R2.resumeMultipartUpload(key, uploadId).complete(parts)
      return new Response(null, { status: 204 })
    }

    if (action === 'abort' && request.method === 'DELETE') {
      if (!uploadId) return errorJson('Invalid multipart upload.', 400)
      await env.R2.resumeMultipartUpload(key, uploadId).abort()
      return new Response(null, { status: 204 })
    }

    if (!action && request.method === 'PUT') {
      const body = await sizedBody(request)
      if (!body) return errorJson('The upload was empty.', 400)
      await env.R2.put(key, body, {
        httpMetadata: { contentType: request.headers.get('content-type') ?? 'application/octet-stream' },
      })
      return new Response(null, { status: 204 })
    }

    return errorJson('Unsupported upload operation.', 400)
  } catch (err) {
    console.error('Upload error:', err)
    return errorJson(err instanceof Error ? err.message : 'Upload failed on the server.', 500)
  }
}

export const POST = handle
export const PUT = handle
export const DELETE = handle
