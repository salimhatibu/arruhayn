'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '@/i18n/dictionary'

import { downloadStored, storedRecordings } from './recorder'

// Offers to save recordings left in this browser when a class ended before they were saved, for
// example because the tab crashed or the device lost power. Renders nothing when there are none.
// Takes the language rather than the wording: wording with functions in it can't be sent from a
// server page to the browser.
export function UnsavedRecordings({ locale }: { locale: Locale }) {
  const text = t(locale).live
  const [files, setFiles] = useState<string[]>([])

  useEffect(() => {
    storedRecordings().then(setFiles).catch(() => {})
  }, [])

  if (!files.length) return null
  return (
    <div className="card" role="status">
      <p>
        <strong>{text.unsaved}</strong>
      </p>
      <div className="controls">
        {files.map((f) => (
          <button key={f} className="btn secondary small" onClick={() => downloadStored(f).then(() => setFiles((l) => l.filter((x) => x !== f)))}>
            {text.save(f)}
          </button>
        ))}
      </div>
    </div>
  )
}
