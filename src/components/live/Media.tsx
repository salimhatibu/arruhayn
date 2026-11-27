'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { Connection } from './useRoom'

// Plays one remote audio track.
export function AudioSink({ track }: { track?: MediaStreamTrack }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.srcObject = track ? new MediaStream([track]) : null
    if (track) ref.current.play().catch(() => {})
  }, [track])
  return <audio ref={ref} autoPlay />
}

// Shows the shared screen.
export function ScreenView({ track, label, muted = true }: { track?: MediaStreamTrack; label: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.srcObject = track ? new MediaStream([track]) : null
    if (track) ref.current.play().catch(() => {})
  }, [track])
  return (
    <div className="stage-screen">
      {track ? <video ref={ref} autoPlay playsInline muted={muted} aria-label={label} /> : <span style={{ opacity: 0.7 }}>{label}</span>}
    </div>
  )
}

// The shared screen with a button that makes it fill the window. Real full screen is used where the
// browser allows it on an element; elsewhere, notably on iPhones, the stage covers the page instead.
// Whatever is passed as children (controls, warnings) stays on screen while it is enlarged.
export function Stage({
  track,
  label,
  expandLabel,
  shrinkLabel,
  children,
}: {
  track?: MediaStreamTrack
  label: string
  expandLabel: string
  shrinkLabel: string
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [big, setBig] = useState(false)

  // Leaving full screen with the browser's own Escape key shrinks the stage too.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setBig(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Where the stage only covers the page, Escape still closes it and the page behind does not scroll.
  useEffect(() => {
    if (!big) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBig(false)
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [big])

  function toggle() {
    if (big) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      setBig(false)
      return
    }
    setBig(true)
    ref.current?.requestFullscreen?.().catch(() => {})
  }

  return (
    <div ref={ref} className={`live-stage${big ? ' is-big' : ''}`}>
      <div className="live-stage-frame">
        <ScreenView track={track} label={label} />
        <button type="button" className="live-stage-toggle" onClick={toggle} aria-pressed={big}>
          {big ? shrinkLabel : expandLabel}
        </button>
      </div>
      {children}
    </div>
  )
}

// Tells everyone in the room whose connection is the problem: their own, or a speaker's.
export function RoomNotices({
  connection,
  weakNames,
  dropped,
  text,
}: {
  connection: Connection
  weakNames: string[]
  dropped: string[]
  text: { reconnecting: string; speakerWeak: (name: string) => string; speakerDropped: (name: string) => string }
}) {
  const items: string[] = []
  if (connection === 'reconnecting' || connection === 'disconnected') items.push(text.reconnecting)
  for (const name of dropped) items.push(text.speakerDropped(name))
  for (const name of weakNames) if (!dropped.includes(name)) items.push(text.speakerWeak(name))
  return (
    <div className="live-notices" role="status" aria-live="polite">
      {items.map((item) => (
        <p key={item} className="notice warn">
          {item}
        </p>
      ))}
    </div>
  )
}
