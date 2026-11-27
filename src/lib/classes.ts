import type { Payload } from 'payload'

import type { Class } from '@/payload-types'

import { endSession } from './realtimekit'

// Starting a class that ended longer ago than this is a new session, so its times and attendance
// start again. Anything sooner is the same class resumed, such as after ending it by mistake.
const NEW_SESSION_AFTER_MS = 60 * 60 * 1000

export const attendanceFor = async (payload: Payload, classId: number) =>
  (await payload.count({ collection: 'class-joins', where: { class: { equals: classId } }, overrideAccess: true })).totalDocs

// Counts one person once per class. A second join from the same browser hits the unique index and
// is ignored, which is the point.
export async function recordJoin(payload: Payload, classId: number, visitor: string) {
  await payload.create({ collection: 'class-joins', data: { class: classId, visitor }, overrideAccess: true }).catch(() => {})
}

// Marks a class live, starting a fresh session record unless it is being resumed.
export async function startClass(payload: Payload, cls: Class, meetingId: string, allowRecording?: boolean) {
  const now = new Date()
  const endedLongAgo = cls.endedAt ? now.getTime() - new Date(cls.endedAt).getTime() > NEW_SESSION_AFTER_MS : false
  const fresh = !cls.startedAt || (cls.status !== 'live' && endedLongAgo)
  if (fresh) {
    await payload.delete({ collection: 'class-joins', where: { class: { equals: cls.id } }, overrideAccess: true })
  }
  return payload.update({
    collection: 'classes',
    id: cls.id,
    overrideAccess: true,
    data: {
      meetingId,
      status: 'live',
      endedAt: null,
      ...(allowRecording === undefined ? {} : { allowRecording }),
      ...(fresh ? { startedAt: now.toISOString(), liveMinutes: null, attendance: null } : {}),
    },
  })
}

// Ends a class for everyone still in it, and records when it ran and how many came. The class is
// marked ended before anyone is removed from the room: removing them makes their pages ask at once
// whether anything is still live, and the answer must already be no.
export async function endClass(payload: Payload, cls: Class) {
  const endedAt = new Date()
  const liveMinutes = cls.startedAt ? Math.max(0, Math.round((endedAt.getTime() - new Date(cls.startedAt).getTime()) / 60_000)) : null
  const ended = await payload.update({
    collection: 'classes',
    id: cls.id,
    overrideAccess: true,
    data: { status: 'ended', endedAt: endedAt.toISOString(), liveMinutes, attendance: await attendanceFor(payload, cls.id) },
  })
  if (cls.meetingId) await endSession(cls.meetingId).catch((err: unknown) => payload.logger.error(err))
  return ended
}
