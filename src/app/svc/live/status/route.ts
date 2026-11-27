import { getPayloadClient } from '@/lib/payload'
import { errorJson } from '@/lib/staff'

// Whether a class is still live. Listeners check this now and then, so they learn a class has
// ended even when the message from the live room never reached them.
export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id < 1) return errorJson('Unknown class.', 400)
  const payload = await getPayloadClient()
  const cls = await payload.findByID({ collection: 'classes', id, depth: 0, overrideAccess: true, disableErrors: true, select: { status: true, allowRecording: true } })
  if (!cls) return errorJson('Unknown class.', 404)
  return Response.json({ status: cls.status, allowRecording: Boolean(cls.allowRecording) }, { headers: { 'cache-control': 'no-store' } })
}
