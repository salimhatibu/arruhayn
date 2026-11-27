'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { LiveIcon } from './icons'
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

// The shared screen, played like a video. Its corner button makes it fill the screen; real full
// screen is used where the browser allows it on an element, and elsewhere (notably iPhones) the stage
// covers the page instead. Enlarged, the video takes the whole screen and `top` (warnings) and
// `controls` float over it, fading away after a few seconds without movement, as in YouTube and
// Zoom. `children` only shows at normal size.
const IDLE_MS = 3000

export function Stage({
  track,
  label,
  fullLabel,
  exitLabel,
  top,
  controls,
  children,
}: {
  track?: MediaStreamTrack
  label: string
  fullLabel: string
  exitLabel: string
  top?: ReactNode
  controls?: ReactNode
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [big, setBig] = useState(false)
  const [idle, setIdle] = useState(false)

  // Leaving full screen with the browser's own Escape key shrinks the stage too.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setBig(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Enlarged: Escape closes it, the page behind does not scroll, and the controls hide when idle.
  useEffect(() => {
    if (!big) return
    const el = ref.current
    let timer = setTimeout(() => setIdle(true), IDLE_MS)
    const wake = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), IDLE_MS)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBig(false)
      else wake()
    }
    const events = ['pointermove', 'pointerdown', 'focusin'] as const
    for (const e of events) el?.addEventListener(e, wake)
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(timer)
      for (const e of events) el?.removeEventListener(e, wake)
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
    setIdle(false)
    setBig(true)
    ref.current?.requestFullscreen?.().catch(() => {})
  }

  const fullButton = (
    <button type="button" className="live-fs" onClick={toggle} title={big ? exitLabel : fullLabel} aria-label={big ? exitLabel : fullLabel} aria-pressed={big}>
      <LiveIcon name={big ? 'exitFullscreen' : 'fullscreen'} size={24} />
    </button>
  )

  return (
    <div ref={ref} className={`live-stage${big ? ' is-big' : ''}${big && idle ? ' is-idle' : ''}`}>
      <div className="live-stage-frame">
        <ScreenView track={track} label={label} />
        {big ? null : fullButton}
      </div>
      {top ? <div className="live-stage-top">{top}</div> : null}
      <div className="live-stage-bottom">
        {controls}
        {big ? fullButton : null}
      </div>
      {big ? null : children}
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
