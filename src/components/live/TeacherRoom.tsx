'use client'

import { useEffect, useRef, useState } from 'react'

import { AudioSink, ScreenView } from './Media'
import { canWriteToFolder, downloadStored, LocalRecorder, storedRecordings, type RecorderMode } from './recorder'
import { screenSharer, useRoom } from './useRoom'

// The teacher's live room, on the admin Worker. Starts the class, manages who speaks, shares the
// screen, and records to the teacher's own computer.

type Request = { displayName: string; userId: string }

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function TeacherRoom({ classId, title, status: initialStatus }: { classId: number; title: string; status: string }) {
  const { meeting, join, leave, remote, speaker, rerender } = useRoom()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(initialStatus)
  const [mode, setMode] = useState<RecorderMode>('audio')
  const [recorder, setRecorder] = useState<LocalRecorder | null>(null)
  const [, setTick] = useState(0)
  const [now, setNow] = useState(0)
  const [leftovers, setLeftovers] = useState<string[]>([])
  const recRef = useRef<LocalRecorder | null>(null)
  useEffect(() => {
    recRef.current = recorder
  }, [recorder])

  useEffect(() => {
    storedRecordings().then(setLeftovers).catch(() => {})
  }, [])

  // Warn before closing the tab while recording.
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

  async function start() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/svc/staff/classes/${classId}/start`, { method: 'POST' })
      const data = (await res.json()) as { authToken?: string; error?: string }
      if (!res.ok || !data.authToken) throw new Error(data.error ?? 'The class could not start.')
      const m = await join(data.authToken)
      if (m.stage.status !== 'ON_STAGE') {
        if (m.stage.status === 'OFF_STAGE') await m.stage.requestAccess().catch(() => {})
        await m.stage.join().catch(() => {})
      }
      await m.self.enableAudio().catch(() => setError('Allow microphone access to speak.'))
      setStatus('live')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The class could not start.')
    } finally {
      setBusy(false)
    }
  }

  async function startRecording() {
    setError('')
    try {
      const rec = new LocalRecorder(mode, title, () => setTick((x) => x + 1))
      await rec.start()
      setRecorder(rec)
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') setError('Recording could not start. Use desktop Chrome or Edge.')
    }
  }

  async function stopRecording() {
    const rec = recorder
    setRecorder(null)
    await rec?.stop()
  }

  async function end() {
    if (recorder) await stopRecording()
    await meeting?.participants?.kickAll?.().catch(() => {})
    await leave()
    await fetch(`/svc/staff/classes/${classId}/end`, { method: 'POST' })
    setStatus('ended')
  }

  if (!meeting) {
    return (
      <div className="stack">
        {leftovers.length ? (
          <div className="card">
            <p>
              <strong>Unsaved recordings were found in this browser.</strong> Save them before starting a new class.
            </p>
            {leftovers.map((f) => (
              <button key={f} className="btn secondary small" onClick={() => downloadStored(f).then(() => setLeftovers((l) => l.filter((x) => x !== f)))}>
                Save {f}
              </button>
            ))}
          </div>
        ) : null}
        <p>{status === 'ended' ? 'This class has ended. You can start it again if you need to.' : 'Start the class when you are ready. Students on the public site will see a "Live now" banner.'}</p>
        <button className="btn" onClick={start} disabled={busy}>
          {busy ? 'Starting…' : status === 'live' ? 'Rejoin the class' : 'Start the class'}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </div>
    )
  }

  const requests: Request[] = meeting.stage.getAccessRequests()?.stageRequests ?? []
  const onStage = remote.filter((p) => p.stageStatus === 'ON_STAGE' || p.audioEnabled)

  return (
    <section className="room">
      {remote.map((p) => (
        <AudioSink key={p.id} track={p.audioEnabled ? p.audioTrack : undefined} />
      ))}
      {sharer && !sharer.self ? <AudioSink track={sharer.tracks?.audio} /> : null}

      <ScreenView track={sharer?.tracks?.video} label={sharer ? `${sharer.name} is sharing their screen` : 'Nobody is sharing their screen'} />

      <div className="controls">
        <button className="btn secondary" onClick={() => (meeting.self.audioEnabled ? meeting.self.disableAudio() : meeting.self.enableAudio()).then(rerender)}>
          {meeting.self.audioEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button
          className="btn secondary"
          onClick={() => (meeting.self.screenShareEnabled ? meeting.self.disableScreenShare() : meeting.self.enableScreenShare()).then(rerender).catch(() => {})}
        >
          {meeting.self.screenShareEnabled ? 'Stop sharing' : 'Share screen'}
        </button>
        <button className="btn danger" onClick={end}>
          End class
        </button>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Recording</h2>
        {recorder ? (
          <>
            <p className="rec">
              Recording {clock(Math.max(0, now - recorder.startedAt))} · {mb(recorder.bytes)}
            </p>
            <p className="small muted">
              {recorder.savedTo ? `Saving into the folder "${recorder.savedTo}" as it records.` : 'Saving in this browser; the file downloads when you stop.'} Keep this tab
              open until you stop recording.
            </p>
            <button className="btn secondary" onClick={stopRecording}>
              Stop recording
            </button>
          </>
        ) : (
          <>
            <fieldset style={{ border: 0, padding: 0, margin: '0 0 1rem' }}>
              <legend className="small muted">What to record</legend>
              <label style={{ fontWeight: 400 }}>
                <input type="radio" name="mode" checked={mode === 'audio'} onChange={() => setMode('audio')} /> Audio only (about 30 MB an hour)
              </label>
              <label style={{ fontWeight: 400 }}>
                <input type="radio" name="mode" checked={mode === 'screen'} onChange={() => setMode('screen')} /> Audio and screen (about 500 MB an hour, plus an audio-only copy)
              </label>
            </fieldset>
            <button className="btn" onClick={startRecording}>
              Start recording
            </button>
            <p className="small muted">
              {canWriteToFolder()
                ? 'You will be asked for a folder on your computer. Nothing is uploaded.'
                : 'This browser can\'t write to a folder, so the recording is kept in the browser and downloaded when you stop. Desktop Chrome or Edge is recommended.'}
            </p>
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Raised hands ({requests.length})</h2>
        {requests.length ? (
          <ul className="list">
            {requests.map((r) => (
              <li key={r.userId} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ flex: 1 }}>{r.displayName}</span>
                <button className="btn small" onClick={() => meeting.stage.grantAccess([r.userId]).then(rerender)}>
                  Bring on stage
                </button>
                <button className="btn ghost small" onClick={() => meeting.stage.denyAccess([r.userId]).then(rerender)}>
                  Decline
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Nobody has raised a hand.</p>
        )}
        <h3 style={{ fontSize: '1rem' }}>On stage</h3>
        {onStage.length ? (
          <ul className="list">
            {onStage.map((p) => (
              <li key={p.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ flex: 1 }} className={speaker === p.id ? 'person speaking' : undefined}>
                  {p.name} {p.screenShareEnabled ? '(sharing screen)' : ''}
                </span>
                <button className="btn ghost small" onClick={() => meeting.stage.kick([p.userId]).then(rerender)}>
                  Remove from stage
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Only you.</p>
        )}
        <p className="muted small">{remote.length} people in the room.</p>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}
