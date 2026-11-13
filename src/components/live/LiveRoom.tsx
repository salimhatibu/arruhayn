'use client'

import { useState, type FormEvent } from 'react'

import { Turnstile } from '@/components/site/Turnstile'
import { t, type Locale } from '@/i18n/dictionary'

import { AudioSink, ScreenView } from './Media'
import { screenSharer, useRoom } from './useRoom'

// The student's view of a live class: listen, watch a shared screen, and raise a hand to speak.
export function LiveRoom({ classId, title, locale, siteKey }: { classId: number; title: string; locale: Locale; siteKey: string }) {
  const d = t(locale).live
  const { meeting, join, leave, remote, speaker } = useRoom()
  const [name, setName] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onJoin(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError(d.yourName)
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/svc/live/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ classId, name: name.trim(), token }),
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

  if (!meeting) {
    return (
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
    )
  }

  const status: string = meeting.stage.status
  const onStage = status === 'ON_STAGE'
  const sharer = screenSharer(meeting, remote)
  const speakers = remote.filter((p) => p.audioEnabled || p.stageStatus === 'ON_STAGE')

  async function raiseHand() {
    if (status === 'REQUESTED_TO_JOIN_STAGE') await meeting.stage.cancelRequestAccess()
    else await meeting.stage.requestAccess()
  }
  async function goOnStage() {
    await meeting.stage.join()
    await meeting.self.enableAudio().catch(() => {})
  }

  return (
    <section className="room" aria-label={title}>
      {remote.map((p) => (
        <AudioSink key={`a-${p.id}`} track={p.audioEnabled ? p.audioTrack : undefined} />
      ))}
      {sharer && !sharer.self ? <AudioSink track={sharer.tracks?.audio} /> : null}

      <ScreenView track={sharer?.tracks?.video} label={sharer ? `${sharer.name} ${d.presenting}` : title} />

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
            <button
              className="btn secondary"
              onClick={() => (meeting.self.screenShareEnabled ? meeting.self.disableScreenShare() : meeting.self.enableScreenShare())}
            >
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
    </section>
  )
}
