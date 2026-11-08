import { getCloudflareContext } from '@opennextjs/cloudflare'

import { hasRole } from '@/access/roles'
import { errorJson, staffUser } from '@/lib/staff'

// Upload through the Worker, for local development or when R2 API keys aren't configured.
// Limited by the Worker request size (100 MB), so production uses presigned URLs instead.
export async function PUT(request: Request) {
  const user = await staffUser(request)
  if (!user || !hasRole(user, 'admin', 'teacher')) return errorJson('Sign in as a teacher to upload.', 401)
  const key = new URL(request.url).searchParams.get('key') ?? ''
  if (!/^recordings\/[\w.-]+$/.test(key)) return errorJson('Invalid upload key.', 400)
  if (!request.body) return errorJson('The upload was empty.', 400)
  const { env } = await getCloudflareContext({ async: true })
  await env.R2.put(key, request.body, {
    httpMetadata: { contentType: request.headers.get('content-type') ?? 'application/octet-stream' },
  })
  return new Response(null, { status: 204 })
}
