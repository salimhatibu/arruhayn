'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Thin wrapper around the RealtimeKit core SDK: joins a meeting with a participant token and
// re-renders whenever anything in the room changes. It also follows the things a listener should be
// told about: the class ending, their own connection dropping, and a speaker's connection failing.

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

// How the room was left: 'ended' when the teacher ended the class, 'kicked' when removed,
// 'disconnected' or 'failed' when the connection gave out, 'left' when the listener chose to.
export type LeftState = 'ended' | 'kicked' | 'left' | 'rejected' | 'disconnected' | 'failed' | (string & {})
// The listener's own link to the room.
export type Connection = 'connected' | 'reconnecting' | 'disconnected' | 'failed'

// RealtimeKit scores each media stream from 0 to 10. A speaker counts as having a weak connection
// below WEAK_BELOW and stops counting at RECOVERED_AT, so a score hovering near the line does not
// make the warning flicker.
const WEAK_BELOW = 4
const RECOVERED_AT = 6
// When a class ends, speakers drop out of the room a moment before the "ended" message arrives.
// Waiting this long before saying a speaker lost their connection avoids a false alarm then.
const DROP_GRACE_MS = 4000

export function useRoom({ hostPreset }: { hostPreset?: string } = {}) {
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [speaker, setSpeaker] = useState<string | null>(null)
  const [left, setLeft] = useState<LeftState | null>(null)
  const [connection, setConnection] = useState<Connection>('connected')
  const [weak, setWeak] = useState<ReadonlySet<string>>(new Set())
  const [dropped, setDropped] = useState<string[]>([])
  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick((t) => t + 1), [])
  const ref = useRef<Meeting | null>(null)
  const leftRef = useRef(false)
  // Who was speaking as of the last render, so a speaker who disappears can be recognised as one.
  const speakingRef = useRef<Set<string>>(new Set())

  const join = useCallback(
    async (authToken: string) => {
      const { default: RealtimeKitClient } = await import('@cloudflare/realtimekit')
      const m: Meeting = await RealtimeKitClient.init({ authToken, defaults: { audio: false, video: false } })
      leftRef.current = false
      setLeft(null)
      setConnection('connected')
      setWeak(new Set())
      setDropped([])
      const joined = m.participants.joined
      for (const event of ['participantJoined', 'participantLeft', 'audioUpdate', 'screenShareUpdate', 'stageStatusUpdate']) {
        joined.on(event, rerender)
      }
      for (const event of ['audioUpdate', 'screenShareUpdate']) m.self.on(event, rerender)
      for (const event of ['stageStatusUpdate', 'stageAccessRequestUpdate', 'newStageRequest']) m.stage.on(event, rerender)
      m.participants.on('activeSpeaker', ({ peerId }: { peerId: string }) => setSpeaker(peerId))

      m.self.on('roomLeft', ({ state }: { state: LeftState }) => {
        leftRef.current = true
        setLeft(state)
      })
      m.meta.on('socketConnectionUpdate', ({ state }: { state: Connection }) => setConnection(state))

      // The map passes the participant first and the event's own payload second.
      joined.on('mediaScoreUpdate', (p: Participant, { kind, isScreenshare, score }: { kind: string; isScreenshare: boolean; score: number }) => {
        if (kind !== 'audio' || isScreenshare) return
        setWeak((prev) => {
          if (!prev.has(p.id) && score < WEAK_BELOW) return new Set(prev).add(p.id)
          if (prev.has(p.id) && score >= RECOVERED_AT) {
            const next = new Set(prev)
            next.delete(p.id)
            return next
          }
          return prev
        })
      })
      joined.on('participantLeft', (p: Participant) => {
        setWeak((prev) => {
          if (!prev.has(p.id)) return prev
          const next = new Set(prev)
          next.delete(p.id)
          return next
        })
        if (!speakingRef.current.has(p.id)) return
        setTimeout(() => {
          if (!leftRef.current) setDropped((prev) => (prev.includes(p.name) ? prev : [...prev, p.name]))
        }, DROP_GRACE_MS)
      })
      // A speaker who comes back gets a new connection but keeps their name.
      joined.on('participantJoined', (p: Participant) => setDropped((prev) => prev.filter((name) => name !== p.name)))

      await m.join()
      ref.current = m
      setMeeting(m)
      return m
    },
    [rerender],
  )

  const leave = useCallback(async () => {
    leftRef.current = true
    await ref.current?.leave().catch(() => {})
    ref.current = null
    setMeeting(null)
    setLeft(null)
  }, [])

  useEffect(
    () => () => {
      ref.current?.leave().catch(() => {})
    },
    [],
  )

  const remote: Participant[] = meeting ? meeting.participants.joined.toArray() : []
  useEffect(() => {
    speakingRef.current = new Set(
      remote.filter((p) => p.stageStatus === 'ON_STAGE' || p.audioEnabled || (hostPreset && p.presetName === hostPreset)).map((p) => p.id),
    )
  })
  return { meeting, join, leave, rerender, remote, speaker, left, connection, weak, dropped }
}

// Who is sharing their screen right now: the local user or a remote participant.
export function screenSharer(meeting: Meeting | null, remote: Participant[]) {
  if (!meeting) return null
  if (meeting.self.screenShareEnabled) return { name: meeting.self.name as string, tracks: meeting.self.screenShareTracks, self: true }
  const p = remote.find((r) => r.screenShareEnabled)
  return p ? { name: p.name, tracks: p.screenShareTracks, self: false } : null
}

// Names of speakers whose connection is weak right now.
export function weakSpeakers(remote: Participant[], weak: ReadonlySet<string>) {
  return remote.filter((p) => weak.has(p.id)).map((p) => p.name)
}
