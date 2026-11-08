'use client'

import { useState, type FormEvent } from 'react'

import { t, type Locale } from '@/i18n/dictionary'

import { Turnstile } from './Turnstile'

export function SubscribeForm({ locale, siteKey }: { locale: Locale; siteKey: string }) {
  const d = t(locale).newsletter
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'done' | 'error'; message?: string }>({ kind: 'idle' })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState({ kind: 'error', message: d.invalidEmail })
    setState({ kind: 'busy' })
    const res = await fetch('/svc/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, locale, token }),
    }).catch(() => null)
    const data = (await res?.json().catch(() => ({}))) as { pending?: boolean; error?: string }
    if (!res?.ok) return setState({ kind: 'error', message: data?.error ?? d.invalidEmail })
    setState({ kind: 'done', message: data.pending ? d.subscribedPending : d.subscribed })
  }

  if (state.kind === 'done') return <p className="notice" role="status">{state.message}</p>

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="subscribe-email" className="sr-only">
        {d.email}
      </label>
      <div className="searchbox" style={{ marginTop: 0 }}>
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
