'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

import { announceLive } from '@/components/site/LiveBannerView'
import { Turnstile } from '@/components/site/Turnstile'
import { serverError, t, type Locale } from '@/i18n/dictionary'

import { ControlButton } from './icons'
import { AudioSink, RoomNotices, Stage } from './Media'
import { QuestionBox } from './QuestionBox'
import { canWriteToFolder, LocalRecorder, type RecorderMode } from './recorder'
import { screenSharer, useRoom, weakSpeakers } from './useRoom'

// The student's view of a live class: listen, watch a shared screen, raise a hand to speak (and,
// once on stage, share a screen), and record the class to their own device when the teacher allows.

// How often a listener checks the class is still live, and whether recording is still allowed, in
// case the room's own messages were missed (a closed laptop lid, a teacher whose browser closed).
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
  allowRecording: initialAllowRecording,
}: {
  classId: number
  title: string
  locale: Locale
  siteKey: string
  hostPreset: string
  allowRecording: boolean
}) {
  const d = t(locale).live
  const { meeting, join, leave, remote, speaker, left, connection, weak, dropped, rerender } = useRoom({ hostPreset })
  const [name, setName] = useState(savedName)
  const [token, setToken] = useState('')
  const [checkRound, setCheckRound] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ended, setEnded] = useState(false)
  const [allowRecording, setAllowRecording] = useState(initialAllowRecording)
  const [mode, setMode] = useState<RecorderMode>('audio')
  const [recorder, setRecorder] = useState<LocalRecorder | null>(null)
  const [recordNote, setRecordNote] = useState('')
  const [stageFailed, setStageFailed] = useState(false)
  const [asking, setAsking] = useState(false)
  const [now, setNow] = useState(0)
  const [, setTick] = useState(0)
  const recRef = useRef<LocalRecorder | null>(null)
  const joiningStage = useRef(false)
  useEffect(() => {
    recRef.current = recorder
  }, [recorder])

  const classOver = ended || left === 'ended' || left === 'kicked'
  const lost = !classOver && (left === 'disconnected' || left === 'failed')
  const stageStatus: string = meeting?.stage.status ?? 'OFF_STAGE'

  // Tell the "Live now" banner straight away, rather than at its next check.
  useEffect(() => {
    if (classOver) announceLive(classId)
  }, [classOver, classId])

  // While in the room, check now and then that the class has not ended without word reaching us,
  // and whether the teacher has changed the recording setting.
  useEffect(() => {
    if (!meeting || classOver) return
    const timer = setInterval(async () => {
      const res = await fetch(`/svc/live/status?id=${classId}`, { cache: 'no-store' }).catch((): null => null)
      const data = res?.ok ? ((await res.json().catch((): null => null)) as { status?: string; allowRecording?: boolean } | null) : null
      if (!data?.status) return
      setAllowRecording(Boolean(data.allowRecording))
      if (data.status !== 'live') {
        setEnded(true)
        leave()
      }
    }, STATUS_EVERY_MS)
    return () => clearInterval(timer)
  }, [meeting, classOver, classId, leave])

  // However the recording comes to an end (the class ends, the connection fails, or the teacher
  // stops allowing it) it is stopped, which saves it to the device.
  const mustStop = classOver || lost || !allowRecording
  useEffect(() => {
    const rec = recRef.current
    if (!mustStop || !rec) return
    recRef.current = null
    rec.stop().then(() => {
      setRecorder(null)
      setRecordNote(allowRecording ? d.recordSaved : d.recordingOff)
    })
  }, [mustStop, allowRecording, d.recordSaved, d.recordingOff])

  // Brought on stage by the teacher: go up straight away, so the microphone and screen controls
  // appear. Done once per acceptance; if it fails, a button lets the listener try themselves.
  useEffect(() => {
    if (stageStatus !== 'ACCEPTED_TO_JOIN_STAGE') {
      joiningStage.current = false
      return
    }
    if (joiningStage.current || !meeting) return
    joiningStage.current = true
    ;(async () => {
      try {
        await meeting.stage.join()
        await meeting.self.enableAudio().catch(() => {})
      } catch {
        setStageFailed(true)
      }
      rerender()
    })()
  }, [stageStatus, meeting, rerender])

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
    if (!token) return setError(t(locale).errors.botCheck)
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
      const data = (await res.json().catch(() => ({}))) as { authToken?: string; error?: string; code?: string }
      if (!res.ok || !data.authToken) {
        setCheckRound((n) => n + 1)
        return setError(serverError(locale, data, d.joinFailed))
      }
      await join(data.authToken)
    } catch {
      setCheckRound((n) => n + 1)
      setError(t(locale).errors.unreachable)
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
    recRef.current = null
    setRecorder(null)
    await rec?.stop()
    setRecordNote(d.recordSaved)
  }

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
      <form onSubmit={onJoin} className="card" style={{ maxWidth: 480 }} noValidate>
        <div className="field">
          <label htmlFor="live-name">{d.yourName}</label>
          <input id="live-name" type="text" autoComplete="nickname" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Turnstile siteKey={siteKey} onToken={setToken} locale={locale} resetKey={checkRound} />
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy} style={{ marginTop: '1rem' }}>
          {busy ? d.joining : d.join}
        </button>
        <p className="help">{d.tapToListen}</p>
      </form>
    )
  }

  const onStage = stageStatus === 'ON_STAGE'
  const handRaised = stageStatus === 'REQUESTED_TO_JOIN_STAGE'
  const speakers = remote.filter((p) => p.audioEnabled || p.stageStatus === 'ON_STAGE')

  async function raiseHand() {
    if (handRaised) await meeting.stage.cancelRequestAccess()
    else await meeting.stage.requestAccess()
    rerender()
  }
  async function goOnStage() {
    setStageFailed(false)
    try {
      await meeting.stage.join()
      await meeting.self.enableAudio().catch(() => {})
    } catch {
      setStageFailed(true)
    }
    rerender()
  }
  async function toggleShare() {
    setError('')
    try {
      if (meeting.self.screenShareEnabled) await meeting.self.disableScreenShare()
      else await meeting.self.enableScreenShare()
    } catch (err) {
      // Choosing Cancel in the browser's screen picker is not a failure.
      const reason = (err as DOMException)?.name
      if (reason !== 'NotAllowedError' && reason !== 'AbortError') setError(d.shareFailed)
    }
    rerender()
  }
  async function toggleMic() {
    await (meeting.self.audioEnabled ? meeting.self.disableAudio() : meeting.self.enableAudio()).catch(() => {})
    rerender()
  }

  const controls = (
    <div className="ctl-wrap">
      {asking ? <QuestionBox classId={classId} visitor={visitorId()} name={name.trim()} locale={locale} onClose={() => setAsking(false)} /> : null}
    <div className="ctl-bar">
      {onStage ? (
        <>
          <ControlButton icon={meeting.self.audioEnabled ? 'mic' : 'micOff'} off={!meeting.self.audioEnabled} label={meeting.self.audioEnabled ? d.mute : d.unmute} onClick={toggleMic} />
          <ControlButton
            icon={meeting.self.screenShareEnabled ? 'stopShare' : 'share'}
            on={meeting.self.screenShareEnabled}
            label={meeting.self.screenShareEnabled ? d.stopSharing : d.shareScreen}
            onClick={toggleShare}
          />
        </>
      ) : stageStatus === 'ACCEPTED_TO_JOIN_STAGE' ? (
        <ControlButton icon="mic" on label={stageFailed ? d.joinStage : d.joiningStage} onClick={goOnStage} />
      ) : (
        <ControlButton icon="hand" on={handRaised} pressed={handRaised} label={handRaised ? d.lowerHand : d.raiseHand} onClick={raiseHand} />
      )}
      {allowRecording ? (
        <ControlButton
          icon={recorder ? 'stop' : 'record'}
          on={Boolean(recorder)}
          label={recorder ? `${d.stopRecordShort} ${clock(Math.max(0, now - recorder.startedAt))}` : d.recordShort}
          onClick={recorder ? stopRecording : startRecording}
        />
      ) : null}
      <ControlButton icon="chat" on={asking} pressed={asking} label={d.ask} onClick={() => setAsking((open) => !open)} />
      <ControlButton icon="leave" danger label={d.leave} onClick={leave} />
    </div>
    </div>
  )

  return (
    <section className="room" aria-label={title}>
      {remote.map((p) => (
        <AudioSink key={`a-${p.id}`} track={p.audioEnabled ? p.audioTrack : undefined} />
      ))}
      {sharer && !sharer.self ? <AudioSink track={sharer.tracks?.audio} /> : null}

      <Stage
        track={sharer?.tracks?.video}
        label={sharer ? `${sharer.name} ${d.presenting}` : title}
        fullLabel={d.fullScreen}
        exitLabel={d.exitFullScreen}
        top={
          <>
            <RoomNotices
              connection={connection}
              weakNames={weakSpeakers(remote, weak)}
              dropped={dropped}
              text={{ reconnecting: d.reconnecting, speakerWeak: d.speakerWeak, speakerDropped: d.speakerDropped }}
            />
            {error ? <p className="notice warn">{error}</p> : null}
          </>
        }
        controls={controls}
      >
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
        {handRaised ? <p className="notice">{d.handRaised}</p> : null}

        {allowRecording ? (
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
              </>
            ) : (
              <>
                <fieldset style={{ border: 0, padding: 0, margin: '0 0 0.5rem' }}>
                  <legend className="small muted">{d.recordModeLabel}</legend>
                  <label style={{ fontWeight: 400 }}>
                    <input type="radio" name="record-mode" checked={mode === 'audio'} onChange={() => setMode('audio')} /> {d.recordAudio}
                  </label>
                  <label style={{ fontWeight: 400 }}>
                    <input type="radio" name="record-mode" checked={mode === 'screen'} onChange={() => setMode('screen')} /> {d.recordScreen}
                  </label>
                </fieldset>
                <p className="small muted">{canWriteToFolder() ? d.recordFolder : d.recordBrowser}</p>
              </>
            )}
            {recordNote ? <p className="small muted">{recordNote}</p> : null}
          </div>
        ) : recordNote ? (
          <p className="small muted">{recordNote}</p>
        ) : null}
      </Stage>
    </section>
  )
}
