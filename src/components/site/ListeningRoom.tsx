'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import { t, type Locale } from '@/i18n/dictionary'
import { formatDuration } from '@/lib/format'
import { useLocalValue } from '@/lib/use-local'

import { BookmarkButton } from './BookmarkButton'
import { Icon } from './Icon'
import { ShareButton } from './ShareButton'

// The audio library as a listening room: a stage that plays the chosen recording, with large round
// controls, and the list of recordings beside it. Playback resumes where the listener stopped, and
// recordings played to the end are counted as listened. Both are kept in this browser only.

export type RoomRecording = {
  id: number
  title: string
  teacher?: string
  date: string
  duration?: number | null
  src: string
  description?: string | null
  topics: { slug: string; name: string }[]
}

const SPEEDS = [1, 1.25, 1.5, 2, 0.75]

function readDone(ids: number[]) {
  try {
    return ids.filter((id) => localStorage.getItem(`done:${id}`) === 'true').length
  } catch {
    return 0
  }
}

function subscribeDone(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener('listened', onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener('listened', onChange)
  }
}

// A vintage ribbon microphone, the room's centrepiece.
function Microphone() {
  return (
    <svg className="room-mic" viewBox="0 0 200 260" aria-hidden="true">
      <defs>
        <linearGradient id="mic-body" x1="0" x2="1">
          <stop offset="0" stopColor="#3a1420" />
          <stop offset="0.45" stopColor="#7a2a3c" />
          <stop offset="1" stopColor="#2a0e17" />
        </linearGradient>
        <linearGradient id="mic-brass" x1="0" x2="1">
          <stop offset="0" stopColor="#9c7434" />
          <stop offset="0.5" stopColor="#e8c27a" />
          <stop offset="1" stopColor="#8a6328" />
        </linearGradient>
        <clipPath id="mic-clip">
          <rect x="62" y="34" width="76" height="126" rx="38" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="246" rx="54" ry="9" fill="#2a0e17" opacity="0.18" />
      <ellipse cx="100" cy="240" rx="46" ry="9" fill="url(#mic-brass)" />
      <rect x="95" y="176" width="10" height="64" rx="3" fill="url(#mic-brass)" />
      <path d="M56 104v36a44 44 0 0 0 88 0v-36" fill="none" stroke="url(#mic-brass)" strokeWidth="8" strokeLinecap="round" />
      <rect x="62" y="34" width="76" height="126" rx="38" fill="url(#mic-body)" />
      <g clipPath="url(#mic-clip)" stroke="#e8c27a" strokeOpacity="0.45" strokeWidth="1.4">
        {Array.from({ length: 14 }, (_, i) => (
          <line key={i} x1="62" x2="138" y1={42 + i * 8.5} y2={42 + i * 8.5} />
        ))}
      </g>
      <rect x="60" y="92" width="80" height="12" rx="3" fill="url(#mic-brass)" />
      <rect x="62" y="34" width="76" height="126" rx="38" fill="none" stroke="url(#mic-brass)" strokeWidth="3" />
      <path d="M76 58c4-10 10-14 18-16" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg className={`sparkle ${className}`} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 1v18M1 10h18M4 4l12 12M16 4 4 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

export function ListeningRoom({
  recordings,
  initialId,
  locale,
  rssHref,
}: {
  recordings: RoomRecording[]
  initialId?: number
  locale: Locale
  rssHref: string
}) {
  const d = t(locale)
  const L = d.library
  const audio = useRef<HTMLAudioElement>(null)
  const [selectedId, setSelectedId] = useState(initialId ?? recordings[0]?.id)
  const current = useMemo(() => recordings.find((r) => r.id === selectedId) ?? recordings[0], [recordings, selectedId])
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [length, setLength] = useState(current?.duration ?? 0)
  const [speed, setSpeed] = useLocalValue<number>('player:speed', 1)
  const [saved, setSaved] = useLocalValue<number>(`pos:${current?.id ?? 0}`, 0)
  const done = useSyncExternalStore(
    subscribeDone,
    () => readDone(recordings.map((r) => r.id)),
    () => 0,
  )

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = SPEEDS.includes(speed) ? speed : 1
  }, [speed, current])

  const choose = useCallback(
    (id: number) => {
      if (id === current?.id) return
      setSelectedId(id)
      setPlaying(false)
      setTime(0)
      window.history.replaceState(null, '', `/${locale}/library/${id}`)
    },
    [current?.id, locale],
  )

  const toggle = useCallback(() => {
    const a = audio.current
    if (!a) return
    if (a.paused) {
      // Pick up where the listener stopped last time.
      if (a.currentTime < 1 && saved > 15) a.currentTime = saved
      a.play().catch(() => {})
    } else a.pause()
  }, [saved])

  const skip = useCallback((by: number) => {
    const a = audio.current
    if (a) a.currentTime = Math.max(0, Math.min(a.duration || Infinity, a.currentTime + by))
  }, [])

  const nextSpeed = () => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1)

  // Space plays and pauses; the arrow keys skip. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ' && !el.closest('button, a')) {
        e.preventDefault()
        toggle()
      }
      const rtl = document.dir === 'rtl'
      if (e.key === 'ArrowLeft') skip(rtl ? 30 : -15)
      if (e.key === 'ArrowRight') skip(rtl ? -15 : 30)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, skip])

  function onTime() {
    const a = audio.current
    if (!a) return
    setTime(a.currentTime)
    if (Math.abs(a.currentTime - saved) >= 5) {
      // Forget the position near the end; the recording then counts as listened.
      if (a.duration && a.duration - a.currentTime < 30) {
        setSaved(null)
        try {
          if (localStorage.getItem(`done:${current.id}`) !== 'true') {
            localStorage.setItem(`done:${current.id}`, 'true')
            window.dispatchEvent(new Event('listened'))
          }
        } catch {
          // Storage unavailable.
        }
      } else setSaved(Math.floor(a.currentTime))
    }
  }

  if (!current) return <p className="story-deck">{L.none}</p>

  const status = playing ? L.playing : time > 0 ? L.paused : L.ready
  return (
    <div className="room-layout">
      <div className="room-main">
        <section className={`stage${playing ? ' is-playing' : ''}`} aria-label={L.stage}>
          <div className="stage-head">
            <span>{L.stage}</span>
            <span className="stage-status" aria-live="polite">
              {playing ? <span className="stage-dot" aria-hidden="true" /> : null}
              {status}
            </span>
          </div>

          <div className="stage-object">
            <svg className="orbit" viewBox="0 0 400 200" aria-hidden="true">
              <ellipse cx="200" cy="100" rx="185" ry="70" />
            </svg>
            <Sparkle className="s1" />
            <Sparkle className="s2" />
            <Sparkle className="s3" />
            <Microphone />
          </div>
          <p className="stage-caption">{current.teacher ? L.lessonBy(current.teacher) : current.title}</p>

          <div className="stage-controls">
            <div className="control">
              <button type="button" className="round" aria-label={L.back15} onClick={() => skip(-15)}>
                <span aria-hidden="true">↺</span>
              </button>
              <span className="control-label">{L.back}</span>
            </div>
            <div className="control">
              <button type="button" className="round main" aria-label={playing ? L.pause : L.play} aria-pressed={playing} onClick={toggle}>
                <span aria-hidden="true" className={playing ? 'glyph-pause' : 'glyph-play'} />
              </button>
              <span className="control-label">{playing ? L.pause : L.play}</span>
            </div>
            <div className="control">
              <button type="button" className="round" aria-label={L.forward} onClick={() => skip(30)}>
                <span aria-hidden="true">↻</span>
              </button>
              <span className="control-label">{L.forward}</span>
            </div>
            <div className="control">
              <button type="button" className="round" aria-label={L.speed} onClick={nextSpeed}>
                <span aria-hidden="true" className="glyph-speed">
                  {speed}×
                </span>
              </button>
              <span className="control-label">{L.speed}</span>
            </div>
          </div>
          <p className="stage-hint">{L.hint}</p>

          <div className="stage-foot">
            <span className="stage-foot-label">{L.nowListening}</span>
            <span className="stage-foot-title" dir="auto">
              {current.title}
            </span>
            <input
              className="seek"
              type="range"
              min={0}
              max={Math.max(1, Math.floor(length))}
              step={1}
              value={Math.floor(time)}
              aria-label={L.seek}
              onChange={(e) => {
                if (audio.current) audio.current.currentTime = Number(e.target.value)
                setTime(Number(e.target.value))
              }}
              style={{ ['--p' as string]: `${length ? (time / length) * 100 : 0}%` }}
            />
            <span className="stage-time">
              {formatDuration(time) || '0:00'} / {formatDuration(length) || '–'}
            </span>
          </div>
          <audio
            ref={audio}
            key={current.id}
            src={current.src}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={onTime}
            onLoadedMetadata={(e) => {
              setLength(e.currentTarget.duration || current.duration || 0)
              e.currentTarget.playbackRate = SPEEDS.includes(speed) ? speed : 1
            }}
          />
        </section>

        <section className="room-selected">
          <div>
            <p className="section-kicker">{L.selected}</p>
            <h2 dir="auto">{current.title}</h2>
            <p className="byline-mono">
              {current.teacher ? <span>{current.teacher}</span> : null}
              <span>{current.date}</span>
              {current.duration ? <span>{formatDuration(current.duration)}</span> : null}
            </p>
            {current.description ? (
              <p className="story-deck" dir="auto">
                {current.description}
              </p>
            ) : null}
            {current.topics.length ? (
              <div className="dateline">
                {current.topics.map((tp) => (
                  <Link key={tp.slug} className="boxed" href={`/${locale}/library?topic=${tp.slug}`}>
                    {tp.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="room-selected-actions">
            <button type="button" className="btn" onClick={toggle}>
              <span aria-hidden="true" className={playing ? 'glyph-pause small' : 'glyph-play small'} />
              {playing ? L.pause : saved > 15 ? L.resume(formatDuration(saved)) : L.play}
            </button>
            {saved > 15 || time > 0 ? (
              <button
                type="button"
                className="read-link"
                onClick={() => {
                  setSaved(null)
                  if (audio.current) audio.current.currentTime = 0
                  setTime(0)
                }}
              >
                {L.startOver}
              </button>
            ) : null}
            <div className="room-share">
              <BookmarkButton
                type="r"
                id={current.id}
                title={current.title}
                href={`/library/${current.id}`}
                labels={{ save: d.saved.save, saved: d.saved.savedLabel }}
              />
              <ShareButton title={current.title} path={`/${locale}/library/${current.id}`} locale={locale} />
            </div>
          </div>
        </section>
      </div>

      <aside className="songbook" aria-label={L.collection}>
        <div className="songbook-head">
          <h2>{L.collection}</h2>
          <span className="count">{L.listened(done, recordings.length)}</span>
        </div>
        <p className="songbook-intro">{L.collectionIntro}</p>
        <ul className="songbook-list">
          {recordings.map((r) => (
            <li key={r.id}>
              <button type="button" aria-current={r.id === current.id} onClick={() => choose(r.id)}>
                <Icon name="headphones" size={15} />
                <span className="songbook-title" dir="auto">
                  {r.title}
                </span>
                <span className="count">{r.duration ? formatDuration(r.duration) : ''}</span>
              </button>
            </li>
          ))}
        </ul>
        <a className="songbook-rss" href={rssHref}>
          <span>{L.rss}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </aside>
    </div>
  )
}
