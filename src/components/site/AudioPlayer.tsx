'use client'

import { useEffect, useRef, useState } from 'react'

import { formatDuration } from '@/lib/format'
import { useLocalValue } from '@/lib/use-local'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

// Audio player with speed control, a 15-second skip back, and resume from where the listener
// stopped (saved in this browser every few seconds).
export function AudioPlayer({
  id,
  src,
  labels,
}: {
  id: number
  src: string
  labels: { speed: string; back15: string; resume: (t: string) => string }
}) {
  const ref = useRef<HTMLAudioElement>(null)
  const [speed, setSpeed] = useLocalValue<number>('player:speed', 1)
  const [position, setPosition] = useLocalValue<number>(`pos:${id}`, 0)
  // The resume button is offered once, for the position saved before this visit.
  const [resumeAt] = useState(() => position)
  const [started, setStarted] = useState(false)
  const offerResume = !started && (resumeAt > 15 || position > 15)
  const resumeTarget = resumeAt > 15 ? resumeAt : position

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = SPEEDS.includes(speed) ? speed : 1
  }, [speed])

  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    let last = 0
    const save = () => {
      if (Math.abs(audio.currentTime - last) < 5) return
      last = audio.currentTime
      // Forget the position once the recording is nearly finished.
      if (audio.duration && audio.duration - audio.currentTime < 30) setPosition(null)
      else setPosition(Math.floor(audio.currentTime))
    }
    audio.addEventListener('timeupdate', save)
    return () => audio.removeEventListener('timeupdate', save)
  }, [setPosition])

  return (
    <div className="player card">
      <audio ref={ref} src={src} controls preload="metadata" onPlay={() => setStarted(true)} />
      <div className="player-controls">
        {offerResume ? (
          <button
            className="btn small"
            onClick={() => {
              if (!ref.current) return
              ref.current.currentTime = resumeTarget
              ref.current.play().catch(() => {})
            }}
          >
            {labels.resume(formatDuration(resumeTarget))}
          </button>
        ) : null}
        <button className="btn secondary small" onClick={() => ref.current && (ref.current.currentTime = Math.max(0, ref.current.currentTime - 15))}>
          ↺ {labels.back15}
        </button>
        <span className="speed" role="group" aria-label={labels.speed} style={{ display: 'inline-flex', gap: '0.25rem' }}>
          {SPEEDS.map((s) => (
            <button key={s} className="btn secondary small" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
              {s}×
            </button>
          ))}
        </span>
      </div>
    </div>
  )
}
