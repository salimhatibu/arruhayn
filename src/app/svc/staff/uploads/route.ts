import { hasRole } from '@/access/roles'
import { presignConfigured, presignPut } from '@/lib/r2'
import { errorJson, json, staffUser } from '@/lib/staff'

const ALLOWED = /^audio\/(mpeg|mp4|x-m4a|aac|ogg|webm|wav)$/
const MAX_BYTES = 2 * 1024 * 1024 * 1024

// Starts a recording upload. Returns a URL the teacher's browser PUTs the file to: a presigned R2
// URL in production, or the direct route below when R2 API keys aren't set (local development).
export async function POST(request: Request) {
  const user = await staffUser(request)
  if (!user || !hasRole(user, 'admin', 'teacher')) return errorJson('Sign in as a teacher to upload.', 401)
  const body = (await request.json().catch(() => null)) as { ext?: string; contentType?: string; size?: number } | null
  const contentType = body?.contentType ?? ''
  if (!ALLOWED.test(contentType)) return errorJson('Upload an MP3, M4A, OGG, or WebM audio file.', 400)
  if (!body?.size || body.size > MAX_BYTES) return errorJson('The file is too large (2 GB at most).', 400)
  const ext = (body.ext ?? 'mp3').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'mp3'
  const key = `recordings/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}.${ext}`
  const uploadUrl = presignConfigured() ? await presignPut(key, contentType) : `/svc/staff/uploads/direct?key=${encodeURIComponent(key)}`
  return json({ key, uploadUrl })
}
