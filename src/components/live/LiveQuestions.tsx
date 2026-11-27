'use client'

import { useCallback, useEffect, useState } from 'react'

// The questions listeners have asked during the class, in the teacher's live room. Waiting ones are
// listed oldest first, in the order they were asked; answered ones fold away below.

export type LiveQuestion = { id: number; question: string; askedBy?: string | null; status: string; createdAt: string }

const CHECK_EVERY_MS = 5000
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export function useLiveQuestions(classId: number, live: boolean) {
  const [questions, setQuestions] = useState<LiveQuestion[]>([])

  const load = useCallback(async () => {
    const res = await fetch(`/svc/staff/classes/${classId}/questions`, { cache: 'no-store' }).catch((): null => null)
    const data = res?.ok ? ((await res.json().catch((): null => null)) as { questions?: LiveQuestion[] } | null) : null
    if (data?.questions) setQuestions(data.questions)
  }, [classId])

  useEffect(() => {
    if (!live) return
    const first = setTimeout(load, 0)
    const timer = setInterval(load, CHECK_EVERY_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [live, load])

  async function mark(id: number, status: 'answered' | 'new') {
    setQuestions((list) => list.map((q) => (q.id === id ? { ...q, status } : q)))
    const res = await fetch(`/svc/staff/classes/${classId}/questions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch((): null => null)
    if (!res?.ok) load()
  }

  return { questions, mark, waiting: questions.filter((q) => q.status === 'new') }
}

export function LiveQuestions({ questions, mark }: { questions: LiveQuestion[]; mark: (id: number, status: 'answered' | 'new') => void }) {
  const waiting = questions.filter((q) => q.status === 'new')
  const answered = questions.filter((q) => q.status !== 'new')
  return (
    <div className="card">
      <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Questions ({waiting.length} waiting)</h2>
      {waiting.length ? (
        <ul className="list live-questions">
          {waiting.map((q) => (
            <li key={q.id}>
              <p className="small muted" style={{ margin: 0 }}>
                {q.askedBy || 'A listener'} · {time(q.createdAt)}
              </p>
              <p style={{ margin: '0.2rem 0 0.5rem', whiteSpace: 'pre-wrap' }}>{q.question}</p>
              <button className="btn small" onClick={() => mark(q.id, 'answered')}>
                Answered
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">No questions yet. Listeners can send you questions from the class page; only you see them.</p>
      )}
      {answered.length ? (
        <details>
          <summary className="small">Answered ({answered.length})</summary>
          <ul className="list live-questions">
            {answered.map((q) => (
              <li key={q.id}>
                <p className="small muted" style={{ margin: 0 }}>
                  {q.askedBy || 'A listener'} · {time(q.createdAt)}
                </p>
                <p style={{ margin: '0.2rem 0 0.5rem', whiteSpace: 'pre-wrap' }}>{q.question}</p>
                <button className="btn ghost small" onClick={() => mark(q.id, 'new')}>
                  Not answered after all
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="small muted" style={{ marginBottom: 0 }}>
        Questions left waiting stay under Fatwas → Questions after the class, so they can still be answered on the site.
      </p>
    </div>
  )
}
