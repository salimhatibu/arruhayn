'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Thin wrapper around the RealtimeKit core SDK: joins a meeting with a participant token and
// re-renders whenever anything in the room changes.

// The SDK's own types are very detailed; the room UI only needs a small part of them.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Meeting = any
export type Participant = {
  id: string
  userId: string
  name: string
  audioEnabled: boolean
  audioTrack?: MediaStreamTrack
  screenShareEnabled: boolean
  screenShareTracks?: { audio?: MediaStreamTrack; video?: MediaStreamTrack }
  stageStatus?: string
  presetName?: string
}

export function useRoom() {
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [speaker, setSpeaker] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick((t) => t + 1), [])
  const ref = useRef<Meeting | null>(null)

  const join = useCallback(
    async (authToken: string) => {
      const { default: RealtimeKitClient } = await import('@cloudflare/realtimekit')
      const m: Meeting = await RealtimeKitClient.init({ authToken, defaults: { audio: false, video: false } })
      const joined = m.participants.joined
      for (const event of ['participantJoined', 'participantLeft', 'audioUpdate', 'screenShareUpdate', 'stageStatusUpdate']) {
        joined.on(event, rerender)
      }
      for (const event of ['audioUpdate', 'screenShareUpdate', 'roomLeft']) m.self.on(event, rerender)
      for (const event of ['stageStatusUpdate', 'stageAccessRequestUpdate', 'newStageRequest']) m.stage.on(event, rerender)
      m.participants.on('activeSpeaker', ({ peerId }: { peerId: string }) => setSpeaker(peerId))
      await m.join()
      ref.current = m
      setMeeting(m)
      return m
    },
    [rerender],
  )

  const leave = useCallback(async () => {
    await ref.current?.leave().catch(() => {})
    ref.current = null
    setMeeting(null)
  }, [])

  useEffect(
    () => () => {
      ref.current?.leave().catch(() => {})
    },
    [],
  )

  const remote: Participant[] = meeting ? meeting.participants.joined.toArray() : []
  return { meeting, join, leave, rerender, remote, speaker }
}

// Who is sharing their screen right now: the local user or a remote participant.
export function screenSharer(meeting: Meeting | null, remote: Participant[]) {
  if (!meeting) return null
  if (meeting.self.screenShareEnabled) return { name: meeting.self.name as string, tracks: meeting.self.screenShareTracks, self: true }
  const p = remote.find((r) => r.screenShareEnabled)
  return p ? { name: p.name, tracks: p.screenShareTracks, self: false } : null
}
