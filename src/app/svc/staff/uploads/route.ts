import { hasRole } from '@/access/roles'
import { audioFileExtension, normalizeAudioMimeType } from '@/lib/audio-upload'
import { presignConfigured, presignPut } from '@/lib/r2'
import { errorJson, json, staffUser } from '@/lib/staff'

const MAX_BYTES = 2 * 1024 * 1024 * 1024

// Starts a recording upload. Returns a URL the teacher's browser PUTs the file to: a presigned R2
// URL in production, or a multipart Worker upload when R2 API keys aren't set.
export async function POST(request: Request) {
  const user = await staffUser(request)
  if (!user || !hasRole(user, 'admin', 'teacher')) return errorJson('Sign in as a teacher to upload.', 401)
  const body = (await request.json().catch((): null => null)) as { contentType?: string; size?: number } | null
  const contentType = normalizeAudioMimeType(body?.contentType ?? '')
  if (!contentType) return errorJson('Upload an MP3, M4A, AAC, OGG, Opus, WAV, or audio WebM file.', 400)
  if (!Number.isSafeInteger(body?.size) || !body?.size || body.size > MAX_BYTES) {
    return errorJson('The file is too large (2 GB at most).', 400)
  }
  const usePresignedUpload = presignConfigured()
  const ext = audioFileExtension(contentType)
  if (!ext) return errorJson('The audio file type is not supported.', 400)
  const key = `recordings/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}.${ext}`
  const uploadUrl = usePresignedUpload
    ? await presignPut(key, contentType)
    : `/svc/staff/uploads/direct?key=${encodeURIComponent(key)}`
  return json({ key, uploadUrl, uploadType: usePresignedUpload ? 'presigned' : 'multipart' })
}
