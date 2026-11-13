'use client'

import { useEffect, useRef } from 'react'

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
