'use client'

import { useState, type FormEvent } from 'react'

import { t, type Locale } from '@/i18n/dictionary'

import { Turnstile } from './Turnstile'

export function AskForm({ locale, siteKey }: { locale: Locale; siteKey: string }) {
  const d = t(locale).ask
  const [question, setQuestion] = useState('')
  const [language, setLanguage] = useState<Locale>(locale)
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (question.trim().length < 20) return setError(d.tooShort)
    setState('busy')
    const res = await fetch('/svc/questions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, language, email, token }),
    }).catch((): null => null)
    if (!res?.ok) {
      setState('idle')
      return setError(d.failed)
    }
    setState('sent')
  }

  if (state === 'sent') return <p className="notice" role="status">{d.sent}</p>

  return (
    <form onSubmit={submit} noValidate className="card" style={{ marginTop: '1.5rem' }}>
      <div className="field">
        <label htmlFor="ask-question">{d.question}</label>
        <textarea
          id="ask-question"
          value={question}
          maxLength={4000}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'ask-error' : undefined}
          onChange={(e) => {
            setQuestion(e.target.value)
            setError('')
          }}
          dir="auto"
        />
        {error ? (
          <p className="error" id="ask-error">
            {error}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="ask-language">{d.language}</label>
        <select id="ask-language" value={language} onChange={(e) => setLanguage(e.target.value as Locale)}>
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="ask-email">{d.email}</label>
        <input id="ask-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="help">{d.emailHelp}</p>
      </div>
      <Turnstile siteKey={siteKey} onToken={setToken} locale={locale} />
      <button className="btn" type="submit" disabled={state === 'busy'} style={{ marginTop: '1rem' }}>
        {state === 'busy' ? d.sending : d.submit}
      </button>
    </form>
  )
}
