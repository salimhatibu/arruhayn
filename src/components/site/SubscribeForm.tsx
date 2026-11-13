'use client'

import { useState, type FormEvent } from 'react'

import { t, type Locale } from '@/i18n/dictionary'

import { Turnstile } from './Turnstile'

export function SubscribeForm({
  locale,
  siteKey,
  onSuccess,
  askForName = false,
}: {
  locale: Locale
  siteKey: string
  onSuccess?: () => void
  askForName?: boolean
}) {
  const d = t(locale).newsletter
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [state, setState] = useState<{
    kind: 'idle' | 'busy' | 'done' | 'error'
    message?: string
  }>({ kind: 'idle' })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (askForName && !name.trim()) return setState({ kind: 'error', message: d.nameRequired })
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState({ kind: 'error', message: d.invalidEmail })
    if (!token)
      return setState({
        kind: 'error',
        message: 'Please wait for the bot check to complete, then try again.',
      })
    setState({ kind: 'busy' })
    const res = await fetch('/svc/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...(askForName ? { name: name.trim() } : {}), email, locale, token }),
    }).catch((): null => null)
    const data = (await res?.json().catch(() => ({}))) as { pending?: boolean; error?: string }
    if (!res?.ok) return setState({ kind: 'error', message: data?.error ?? d.invalidEmail })
    setState({ kind: 'done', message: data.pending ? d.subscribedPending : d.subscribed })
    try {
      localStorage.setItem('arruhayn-subscribed', '1')
    } catch {}
    onSuccess?.()
  }

  if (state.kind === 'done')
    return (
      <p className="notice" role="status">
        {state.message}
      </p>
    )

  return (
    <form onSubmit={submit} noValidate>
      <div className="subscribe-row">
        {askForName ? (
          <>
            <label htmlFor="subscribe-name" className="sr-only">
              {d.name}
            </label>
            <input
              id="subscribe-name"
              type="text"
              autoComplete="name"
              maxLength={120}
              placeholder={d.name}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (state.kind === 'error') setState({ kind: 'idle' })
              }}
              required
            />
          </>
        ) : null}
        <label htmlFor="subscribe-email" className="sr-only">
          {d.email}
        </label>
        <input
          id="subscribe-email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (state.kind === 'error') setState({ kind: 'idle' })
          }}
          required
        />
        <button className="btn" type="submit" disabled={state.kind === 'busy'}>
          {d.subscribe}
        </button>
      </div>
      {state.kind === 'error' ? <p className="error">{state.message}</p> : null}
      <Turnstile siteKey={siteKey} onToken={setToken} locale={locale} />
    </form>
  )
}
