'use client'

import { Button, useField } from '@payloadcms/ui'
import { useState } from 'react'

// Uploads a recording from the teacher's computer straight to storage. Recordings made in the
// live room are WebM/Opus; those are converted to MP3 first so every browser and podcast app plays
// them. MP3 and M4A files are uploaded as they are.

const SAMPLE_RATE = 16000
const KBPS = 48
const MAX_CONVERT_BYTES = 400 * 1024 * 1024

async function convertToMp3(file: File, onProgress: (p: number) => void): Promise<{ blob: Blob; seconds: number }> {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
  const decoded = await ctx.decodeAudioData(await file.arrayBuffer())
  await ctx.close()
  // Mix down to mono.
  const mono = new Float32Array(decoded.length)
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const data = decoded.getChannelData(c)
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / decoded.numberOfChannels
  }
  const worker = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' })
  const blob = await new Promise<Blob>((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.progress !== undefined) onProgress(e.data.progress)
      if (e.data.done) resolve(e.data.done)
    }
    worker.onerror = (e) => reject(new Error(e.message))
    worker.postMessage({ samples: mono, sampleRate: SAMPLE_RATE, kbps: KBPS }, [mono.buffer])
  })
  worker.terminate()
  return { blob, seconds: Math.round(decoded.duration) }
}

function mediaDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0)
      URL.revokeObjectURL(audio.src)
    }
    audio.onerror = () => resolve(0)
    audio.src = URL.createObjectURL(file)
  })
}

export function AudioUpload() {
  const key = useField<string>({ path: 'fileKey' })
  const mime = useField<string>({ path: 'mimeType' })
  const size = useField<number>({ path: 'sizeBytes' })
  const duration = useField<number>({ path: 'durationSeconds' })
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  async function upload() {
    if (!file) return setStatus('Choose an audio file first.')
    setBusy(true)
    try {
      let body: Blob = file
      let seconds = 0
      const needsConversion = /webm|ogg|opus|wav/.test(file.type) || /\.(webm|ogg|opus|wav)$/i.test(file.name)
      if (needsConversion && file.size <= MAX_CONVERT_BYTES) {
        setStatus('Converting to MP3…')
        const converted = await convertToMp3(file, (p) => setStatus(`Converting to MP3… ${Math.round(p * 100)}%`))
        body = converted.blob
        seconds = converted.seconds
      } else {
        seconds = await mediaDuration(file)
      }
      const contentType = body.type || file.type || 'audio/mpeg'
      const ext = contentType === 'audio/mpeg' ? 'mp3' : (file.name.split('.').pop() ?? 'audio')
      setStatus('Preparing upload…')
      const res = await fetch('/svc/staff/uploads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ext, contentType, size: body.size }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'The upload could not start.')
      const { uploadUrl, key: fileKey } = (await res.json()) as { uploadUrl: string; key: string }

      setStatus('Uploading… 0%')
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('content-type', contentType)
        xhr.upload.onprogress = (e) => e.lengthComputable && setStatus(`Uploading… ${Math.round((e.loaded / e.total) * 100)}%`)
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`)))
        xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'))
        xhr.send(body)
      })
      key.setValue(fileKey)
      mime.setValue(contentType)
      size.setValue(body.size)
      duration.setValue(seconds)
      setStatus('Uploaded. Save the recording to keep it.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 32, padding: 16, border: '1px solid var(--theme-elevation-150)', borderRadius: 8 }}>
      <h4 style={{ marginTop: 0 }}>Audio file</h4>
      {key.value ? <p>Current file: <code>{key.value}</code></p> : null}
      <input
        type="file"
        accept="audio/*,.webm,.ogg,.opus,.mp3,.m4a"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        disabled={busy}
      />
      <div style={{ marginTop: 12 }}>
        <Button onClick={upload} disabled={busy || !file} buttonStyle="secondary" size="small">
          {key.value ? 'Replace audio' : 'Upload audio'}
        </Button>
      </div>
      {status ? <p role="status">{status}</p> : null}
      <p style={{ opacity: 0.7, fontSize: 13 }}>
        Recordings from the live room are converted to MP3 (about 20 MB an hour) before uploading.
      </p>
    </div>
  )
}
