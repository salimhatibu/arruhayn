'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

import { Turnstile } from '@/components/site/Turnstile'
import { t, type Locale } from '@/i18n/dictionary'

import { AudioSink, RoomNotices, Stage } from './Media'
import { canWriteToFolder, downloadStored, LocalRecorder, storedRecordings, type RecorderMode } from './recorder'
import { screenSharer, useRoom, weakSpeakers } from './useRoom'

// The student's view of a live class: listen, watch a shared screen, raise a hand to speak, and
// record the class to their own device.

// How often a listener checks the class is still live, in case the room's own "ended" message was
// missed (a closed laptop lid, a teacher whose browser closed before ending the class).
const STATUS_EVERY_MS = 30_000

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// A random id this browser keeps, so attendance counts a listener once however often they rejoin.
// It says nothing about the person.
function visitorId() {
  try {
    const saved = localStorage.getItem('arruhayn-visitor')
    if (saved) return saved
    const id = crypto.randomUUID()
    localStorage.setItem('arruhayn-visitor', id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

const savedName = () => {
  try {
    return localStorage.getItem('arruhayn-live-name') ?? ''
  } catch {
    return ''
  }
}

export function LiveRoom({
  classId,
  title,
  locale,
  siteKey,
  hostPreset,
}: {
  classId: number
  title: string
  locale: Locale
  siteKey: string
  hostPreset: string
}) {
  const d = t(locale).live
  const { meeting, join, leave, remote, speaker, left, connection, weak, dropped, rerender } = useRoom({ hostPreset })
  const [name, setName] = useState(savedName)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ended, setEnded] = useState(false)
  const [mode, setMode] = useState<RecorderMode>('audio')
  const [recorder, setRecorder] = useState<LocalRecorder | null>(null)
  const [recordNote, setRecordNote] = useState('')
  const [leftovers, setLeftovers] = useState<string[]>([])
  const [now, setNow] = useState(0)
  const [, setTick] = useState(0)
  const recRef = useRef<LocalRecorder | null>(null)
  useEffect(() => {
    recRef.current = recorder
  }, [recorder])

  const classOver = ended || left === 'ended' || left === 'kicked'
  const lost = !classOver && (left === 'disconnected' || left === 'failed')

  useEffect(() => {
    storedRecordings().then(setLeftovers).catch(() => {})
  }, [])

  // While in the room, check now and then that the class has not ended without word reaching us.
  useEffect(() => {
    if (!meeting || classOver) return
    const timer = setInterval(async () => {
      const res = await fetch(`/svc/live/status?id=${classId}`, { cache: 'no-store' }).catch((): null => null)
      const data = res?.ok ? ((await res.json().catch((): null => null)) as { status?: string } | null) : null
      if (data?.status && data.status !== 'live') {
        setEnded(true)
        leave()
      }
    }, STATUS_EVERY_MS)
    return () => clearInterval(timer)
  }, [meeting, classOver, classId, leave])

  // A recording still running when the class ends is stopped, which saves it.
  useEffect(() => {
    const rec = recRef.current
    if (!(classOver || lost) || !rec) return
    recRef.current = null
    rec.stop().then(() => {
      setRecorder(null)
      setRecordNote(d.recordSaved)
    })
  }, [classOver, lost, d.recordSaved])

  // Warn before closing the tab while recording, and keep the timer moving.
  useEffect(() => {
    if (!recorder) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.removeEventListener('beforeunload', warn)
      clearInterval(timer)
    }
  }, [recorder])

  const sharer = screenSharer(meeting, remote)

  // Keep the recording mix in step with the room.
  useEffect(() => {
    const rec = recRef.current
    if (!rec || !meeting) return
    const tracks: MediaStreamTrack[] = []
    if (meeting.self.audioEnabled && meeting.self.audioTrack) tracks.push(meeting.self.audioTrack)
    for (const p of remote) if (p.audioEnabled && p.audioTrack) tracks.push(p.audioTrack)
    if (sharer?.tracks?.audio) tracks.push(sharer.tracks.audio)
    rec.setAudioTracks(tracks)
    rec.setScreenTrack(sharer?.tracks?.video).catch(() => {})
  })

  async function onJoin(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError(d.yourName)
    setBusy(true)
    setError('')
    try {
      try {
        localStorage.setItem('arruhayn-live-name', name.trim())
      } catch {
        // Private browsing can refuse storage; the name is only a convenience for next time.
      }
      const res = await fetch('/svc/live/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ classId, name: name.trim(), token, visitor: visitorId() }),
      })
      const data = (await res.json()) as { authToken?: string; error?: string }
      if (!res.ok || !data.authToken) throw new Error(data.error ?? d.joinFailed)
      await join(data.authToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : d.joinFailed)
    } finally {
      setBusy(false)
    }
  }

  async function startRecording() {
    setRecordNote('')
    try {
      const rec = new LocalRecorder(mode, title, () => setTick((x) => x + 1))
      await rec.start()
      setRecorder(rec)
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') setRecordNote(d.recordFailed)
    }
  }

  async function stopRecording() {
    const rec = recorder
    setRecorder(null)
    await rec?.stop()
    setRecordNote(d.recordSaved)
  }

  const leftoverList = leftovers.length ? (
    <div className="card">
      <p>
        <strong>{d.unsaved}</strong>
      </p>
      {leftovers.map((f) => (
        <button key={f} className="btn secondary small" onClick={() => downloadStored(f).then(() => setLeftovers((l) => l.filter((x) => x !== f)))}>
          {d.save(f)}
        </button>
      ))}
    </div>
  ) : null

  if (classOver) {
    return (
      <div className="card" role="status">
        <h2 style={{ marginTop: 0 }}>{d.ended}</h2>
        <p>{d.endedHint}</p>
        {recordNote ? <p className="small muted">{recordNote}</p> : null}
      </div>
    )
  }

  if (lost) {
    return (
      <div className="card" role="alert">
        <p>{d.lostConnection}</p>
        {recordNote ? <p className="small muted">{recordNote}</p> : null}
        {/* A fresh bot check is needed to join again, so rejoining starts from the page. */}
        <button className="btn" onClick={() => window.location.reload()}>
          {d.rejoin}
        </button>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="stack">
        {leftoverList}
        <form onSubmit={onJoin} className="card" style={{ maxWidth: 480 }} noValidate>
          <div className="field">
            <label htmlFor="live-name">{d.yourName}</label>
            <input id="live-name" type="text" autoComplete="nickname" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Turnstile siteKey={siteKey} onToken={setToken} locale={locale} />
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy} style={{ marginTop: '1rem' }}>
            {busy ? d.joining : d.join}
          </button>
          <p className="help">{d.tapToListen}</p>
        </form>
      </div>
    )
  }

  const status: string = meeting.stage.status
  const onStage = status === 'ON_STAGE'
  const speakers = remote.filter((p) => p.audioEnabled || p.stageStatus === 'ON_STAGE')

  async function raiseHand() {
    if (status === 'REQUESTED_TO_JOIN_STAGE') await meeting.stage.cancelRequestAccess()
    else await meeting.stage.requestAccess()
  }
  async function goOnStage() {
    await meeting.stage.join()
    await meeting.self.enableAudio().catch(() => {})
  }
  async function toggleShare() {
    setError('')
    try {
      if (meeting.self.screenShareEnabled) await meeting.self.disableScreenShare()
      else await meeting.self.enableScreenShare()
    } catch (err) {
      // Choosing Cancel in the browser's screen picker is not a failure.
      if ((err as DOMException)?.name !== 'NotAllowedError' && (err as DOMException)?.name !== 'AbortError') setError(d.shareFailed)
    }
    rerender()
  }

  return (
    <section className="room" aria-label={title}>
      {remote.map((p) => (
        <AudioSink key={`a-${p.id}`} track={p.audioEnabled ? p.audioTrack : undefined} />
      ))}
      {sharer && !sharer.self ? <AudioSink track={sharer.tracks?.audio} /> : null}

      <Stage
        track={sharer?.tracks?.video}
        label={sharer ? `${sharer.name} ${d.presenting}` : title}
        expandLabel={d.fullScreen}
        shrinkLabel={d.exitFullScreen}
      >
        <RoomNotices
          connection={connection}
          weakNames={weakSpeakers(remote, weak)}
          dropped={dropped}
          text={{ reconnecting: d.reconnecting, speakerWeak: d.speakerWeak, speakerDropped: d.speakerDropped }}
        />
        <div className="people" aria-label={d.speaking}>
          {speakers.map((p) => (
            <span key={p.id} className={`person ${speaker === p.id ? 'speaking' : ''}`}>
              {p.name}
            </span>
          ))}
          <span className="muted small" style={{ alignSelf: 'center' }}>
            {d.listeners(remote.length + 1)}
          </span>
        </div>

        <div className="controls">
          {status === 'ACCEPTED_TO_JOIN_STAGE' ? (
            <button className="btn" onClick={goOnStage}>
              {d.onStage}
            </button>
          ) : onStage ? (
            <>
              <button className="btn secondary" onClick={() => (meeting.self.audioEnabled ? meeting.self.disableAudio() : meeting.self.enableAudio())}>
                {meeting.self.audioEnabled ? d.mute : d.unmute}
              </button>
              <button className="btn secondary" onClick={toggleShare}>
                {meeting.self.screenShareEnabled ? d.stopSharing : d.shareScreen}
              </button>
            </>
          ) : (
            <button className="btn secondary" onClick={raiseHand} aria-pressed={status === 'REQUESTED_TO_JOIN_STAGE'}>
              {status === 'REQUESTED_TO_JOIN_STAGE' ? d.lowerHand : d.raiseHand}
            </button>
          )}
          <button className="btn ghost" onClick={leave}>
            {d.leave}
          </button>
        </div>
        {status === 'REQUESTED_TO_JOIN_STAGE' ? <p className="notice">{d.handRaised}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </Stage>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>{d.record}</h2>
        {recorder ? (
          <>
            <p className="rec">
              {d.recordingNow} {clock(Math.max(0, now - recorder.startedAt))} · {mb(recorder.bytes)}
            </p>
            <p className="small muted">
              {recorder.savedTo ? d.recordSavingTo(recorder.savedTo) : d.recordBrowser} {d.recordKeepOpen}
            </p>
            <button className="btn secondary" onClick={stopRecording}>
              {d.stopRecording}
            </button>
          </>
        ) : (
          <>
            <fieldset style={{ border: 0, padding: 0, margin: '0 0 1rem' }}>
              <label style={{ fontWeight: 400 }}>
                <input type="radio" name="record-mode" checked={mode === 'audio'} onChange={() => setMode('audio')} /> {d.recordAudio}
              </label>
              <label style={{ fontWeight: 400 }}>
                <input type="radio" name="record-mode" checked={mode === 'screen'} onChange={() => setMode('screen')} /> {d.recordScreen}
              </label>
            </fieldset>
            <button className="btn secondary" onClick={startRecording}>
              {d.startRecording}
            </button>
            <p className="small muted">{canWriteToFolder() ? d.recordFolder : d.recordBrowser}</p>
          </>
        )}
        {recordNote ? <p className="small muted">{recordNote}</p> : null}
      </div>
    </section>
  )
}
