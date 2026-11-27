'use client'

import { useEffect, useRef, useState } from 'react'

import { ControlButton } from './icons'
import { LiveQuestions, useLiveQuestions } from './LiveQuestions'
import { AudioSink, RoomNotices, Stage } from './Media'
import { canWriteToFolder, LocalRecorder, type RecorderMode } from './recorder'
import { UnsavedRecordings } from './UnsavedRecordings'
import { screenSharer, useRoom, weakSpeakers } from './useRoom'

// The teacher's live room, on the admin Worker. Starts the class, manages who speaks, shares the
// screen, and records to the teacher's own computer.

type Request = { displayName: string; userId: string }

// When the class last ran, as recorded by the start and end routes.
export type Session = { startedAt?: string | null; endedAt?: string | null; liveMinutes?: number | null; attendance?: number | null }

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function SessionSummary({ session }: { session: Session }) {
  if (!session.startedAt) return null
  return (
    <dl className="session-summary">
      <dt>Started</dt>
      <dd>{when(session.startedAt)}</dd>
      <dt>Ended</dt>
      <dd>{when(session.endedAt)}</dd>
      <dt>Ran for</dt>
      <dd>{session.liveMinutes == null ? '—' : `${session.liveMinutes} min`}</dd>
      <dt>People who joined</dt>
      <dd>{session.attendance ?? '—'}</dd>
    </dl>
  )
}

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function TeacherRoom({
  classId,
  title,
  status: initialStatus,
  hostPreset,
  session: initialSession,
  allowRecording: initialAllowRecording,
}: {
  classId: number
  title: string
  status: string
  hostPreset: string
  session: Session
  allowRecording: boolean
}) {
  const { meeting, join, leave, remote, speaker, rerender, connection, weak, dropped } = useRoom({ hostPreset })
  const [session, setSession] = useState<Session>(initialSession)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(initialStatus)
  const [mode, setMode] = useState<RecorderMode>('audio')
  const [recorder, setRecorder] = useState<LocalRecorder | null>(null)
  const [, setTick] = useState(0)
  const [now, setNow] = useState(0)
  const [allowRecording, setAllowRecording] = useState(initialAllowRecording)
  const { questions, mark, waiting } = useLiveQuestions(classId, Boolean(meeting))
  const recRef = useRef<LocalRecorder | null>(null)
  useEffect(() => {
    recRef.current = recorder
  }, [recorder])

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
      const res = await fetch(`/svc/staff/classes/${classId}/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ allowRecording }),
      })
      const data = (await res.json().catch(() => ({}))) as { authToken?: string; error?: string }
      if (!res.ok || !data.authToken) throw new Error(data.error ?? 'The class could not start. Check the connection and try again.')
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
    if (!window.confirm('End the class for everyone? Listeners are told it has ended.')) return
    if (recorder) await stopRecording()
    // The server ends the meeting for everyone and records the session. If it can't be reached,
    // this browser ends the meeting itself so listeners are not left waiting.
    const res = await fetch(`/svc/staff/classes/${classId}/end`, { method: 'POST' }).catch((): null => null)
    if (res?.ok) setSession((await res.json()) as Session)
    else await meeting?.participants?.kickAll?.().catch(() => {})
    await leave()
    setStatus('ended')
  }

  // Listeners see the change at their room's next status check, within half a minute.
  async function changeRecording(allowed: boolean) {
    setAllowRecording(allowed)
    const res = await fetch(`/svc/staff/classes/${classId}/recording`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ allowRecording: allowed }),
    }).catch((): null => null)
    if (!res?.ok) {
      setAllowRecording(!allowed)
      setError('The recording setting could not be saved. Try again.')
    }
  }

  async function toggleMic() {
    await (meeting.self.audioEnabled ? meeting.self.disableAudio() : meeting.self.enableAudio()).catch(() => setError('Allow microphone access to speak.'))
    rerender()
  }

  async function toggleShare() {
    setError('')
    try {
      if (meeting.self.screenShareEnabled) await meeting.self.disableScreenShare()
      else await meeting.self.enableScreenShare()
    } catch (err) {
      const name = (err as DOMException)?.name
      if (name !== 'NotAllowedError' && name !== 'AbortError') setError('Your screen could not be shared. Use Chrome or Edge on a computer.')
    }
    rerender()
  }

  const recordingChoice = (
    <label className="check">
      <input type="checkbox" checked={allowRecording} onChange={(e) => (meeting ? changeRecording(e.target.checked) : setAllowRecording(e.target.checked))} />
      Let listeners record this class to their own devices
    </label>
  )

  if (!meeting) {
    return (
      <div className="stack">
        <UnsavedRecordings locale="en" />
        <p>{status === 'ended' ? 'This class has ended. You can start it again if you need to.' : 'Start the class when you are ready. Students on the public site will see a "Live now" banner.'}</p>
        {status === 'ended' ? <SessionSummary session={session} /> : null}
        {recordingChoice}
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
    <section className="room room-teacher">
      {remote.map((p) => (
        <AudioSink key={p.id} track={p.audioEnabled ? p.audioTrack : undefined} />
      ))}
      {sharer && !sharer.self ? <AudioSink track={sharer.tracks?.audio} /> : null}

      <Stage
        track={sharer?.tracks?.video}
        label={sharer ? `${sharer.name} is sharing their screen` : 'Nobody is sharing their screen'}
        fullLabel="Full screen"
        exitLabel="Exit full screen"
        top={
          <>
            <RoomNotices
              connection={connection}
              weakNames={weakSpeakers(remote, weak)}
              dropped={dropped}
              text={{
                reconnecting: 'Your connection dropped. Reconnecting… Listeners are told it is your connection, not theirs.',
                speakerWeak: (name) => `${name}'s connection is weak, so their sound may break up.`,
                speakerDropped: (name) => `${name} has lost their connection.`,
              }}
            />
            {error ? <p className="notice warn">{error}</p> : null}
            {waiting.length ? <p className="notice">{waiting.length === 1 ? '1 question waiting' : `${waiting.length} questions waiting`}</p> : null}
          </>
        }
        controls={
          <div className="ctl-bar">
            <ControlButton icon={meeting.self.audioEnabled ? 'mic' : 'micOff'} off={!meeting.self.audioEnabled} label={meeting.self.audioEnabled ? 'Mute' : 'Unmute'} onClick={toggleMic} />
            <ControlButton
              icon={meeting.self.screenShareEnabled ? 'stopShare' : 'share'}
              on={meeting.self.screenShareEnabled}
              label={meeting.self.screenShareEnabled ? 'Stop sharing' : 'Share screen'}
              onClick={toggleShare}
            />
            <ControlButton
              icon={recorder ? 'stop' : 'record'}
              on={Boolean(recorder)}
              label={recorder ? `Stop recording ${clock(Math.max(0, now - recorder.startedAt))}` : 'Record'}
              onClick={recorder ? stopRecording : startRecording}
            />
            <ControlButton icon="leave" danger label="End class" onClick={end} />
          </div>
        }
      />

      <div className="room-side">
      <LiveQuestions questions={questions} mark={mark} />

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Recording</h2>
        {recordingChoice}
        {recorder ? (
          <>
            <p className="rec">
              Recording {clock(Math.max(0, now - recorder.startedAt))} · {mb(recorder.bytes)}
            </p>
            <p className="small muted">
              {recorder.savedTo ? `Saving into the folder "${recorder.savedTo}" as it records.` : 'Saving in this browser; the file downloads when you stop.'} Keep this tab
              open until you stop recording.
            </p>
          </>
        ) : (
          <>
            <fieldset style={{ border: 0, padding: 0, margin: '0 0 1rem' }}>
              <legend className="small muted">What to record</legend>
              <label style={{ fontWeight: 400 }}>
                <input type="radio" name="mode" checked={mode === 'audio'} onChange={() => setMode('audio')} /> Audio only (no size limit; roughly 30 MB per hour)
              </label>
              <label style={{ fontWeight: 400 }}>
                <input type="radio" name="mode" checked={mode === 'screen'} onChange={() => setMode('screen')} /> Audio and screen (no size limit; roughly 500 MB per hour, plus an audio-only copy)
              </label>
            </fieldset>
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
      </div>
    </section>
  )
}
