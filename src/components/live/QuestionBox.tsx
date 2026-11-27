'use client'

import { useState, type FormEvent } from 'react'

import { serverError, t, type Locale } from '@/i18n/dictionary'

// A listener's question to the teacher during a live class. Only the teacher sees it.
export function QuestionBox({
  classId,
  visitor,
  name,
  locale,
  onClose,
}: {
  classId: number
  visitor: string
  name: string
  locale: Locale
  onClose: () => void
}) {
  const d = t(locale).live
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)

  async function send(e: FormEvent) {
    e.preventDefault()
    if (question.trim().length < 5) return setNote({ ok: false, text: t(locale).errors.questionShort })
    setBusy(true)
    setNote(null)
    const res = await fetch('/svc/live/question', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ classId, visitor, name, question: question.trim(), locale }),
    }).catch((): null => null)
    const data = (await res?.json().catch(() => ({}))) as { error?: string; code?: string } | undefined
    setBusy(false)
    if (!res?.ok) return setNote({ ok: false, text: serverError(locale, data, t(locale).errors.generic) })
    setQuestion('')
    setNote({ ok: true, text: d.asked })
  }

  return (
    <form className="question-box" onSubmit={send}>
      <div className="question-box-head">
        <label htmlFor="live-question">{d.ask}</label>
        <button type="button" className="question-box-close" onClick={onClose} aria-label={d.close}>
          ×
        </button>
      </div>
      <textarea
        id="live-question"
        rows={3}
        maxLength={1000}
        placeholder={d.askPlaceholder}
        value={question}
        onChange={(e) => {
          setQuestion(e.target.value)
          if (note && !note.ok) setNote(null)
        }}
        // Ctrl or Cmd with Enter sends, as in chat apps; Enter alone starts a new line.
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit()
        }}
      />
      <div className="question-box-foot">
        <span className="small muted">{d.askHint}</span>
        <button className="btn small" type="submit" disabled={busy || !question.trim()}>
          {busy ? d.sending : d.send}
        </button>
      </div>
      {note ? (
        <p className={note.ok ? 'small question-box-ok' : 'error small'} role="status">
          {note.text}
        </p>
      ) : null}
    </form>
  )
}
