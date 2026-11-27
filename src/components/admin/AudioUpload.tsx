'use client'

import { Button, useField } from '@payloadcms/ui'
import { useState } from 'react'

import { audioContentType, shouldConvertAudioToMp3 } from '@/lib/audio-upload'

// Uploads a recording from the teacher's computer straight to storage. Recordings made in the
// live room are WebM/Opus; those are converted to MP3 first so every browser plays
// them. MP3 and M4A files are uploaded as they are.

const SAMPLE_RATE = 16000
const KBPS = 48
const MAX_CONVERT_BYTES = 100 * 1024 * 1024
const MAX_CONVERT_SECONDS = 2 * 60 * 60
const UPLOAD_PART_BYTES = 8 * 1024 * 1024

async function convertToMp3(file: File, onProgress: (p: number) => void): Promise<{ blob: Blob; seconds: number }> {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(await file.arrayBuffer())
  } finally {
    await ctx.close()
  }
  if (decoded.duration > MAX_CONVERT_SECONDS) throw new Error('Audio is longer than the two-hour conversion limit.')

  // Mix down to mono.
  const mono = new Float32Array(decoded.length)
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const data = decoded.getChannelData(c)
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / decoded.numberOfChannels
  }
  const worker = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' })
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data.progress !== undefined) onProgress(e.data.progress)
        if (e.data.error) reject(new Error(e.data.error))
        if (e.data.done) {
          if (!e.data.done.size) reject(new Error('MP3 conversion produced an empty file.'))
          else resolve(e.data.done)
        }
      }
      worker.onerror = (e) => reject(new Error(e.message))
      worker.postMessage({ samples: mono, sampleRate: SAMPLE_RATE, kbps: KBPS }, [mono.buffer])
    })
    return { blob, seconds: Math.round(decoded.duration) }
  } finally {
    worker.terminate()
  }
}

function mediaDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio')
    const url = URL.createObjectURL(file)
    const finish = (seconds: number) => {
      URL.revokeObjectURL(url)
      resolve(seconds)
    }
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      finish(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0)
    }
    audio.onerror = () => finish(0)
    audio.src = url
  })
}

function uploadError(status: number, responseText: string) {
  try {
    const body = JSON.parse(responseText) as { error?: string }
    if (body.error) return body.error
  } catch {
    if (responseText.trim()) return responseText.trim()
  }
  return `Upload failed (${status}).`
}

async function checkedRequest(url: string, method: string, body?: BodyInit) {
  const response = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body,
  })
  if (!response.ok) throw new Error(uploadError(response.status, await response.text()))
  return response
}

function directUploadUrl(uploadUrl: string, action: string, params: Record<string, string> = {}) {
  const url = new URL(uploadUrl, window.location.origin)
  url.searchParams.set('action', action)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
  return url.toString()
}

async function uploadMultipart(
  uploadUrl: string,
  contentType: string,
  body: Blob,
  onProgress: (progress: number) => void,
) {
  const createResponse = await checkedRequest(
    directUploadUrl(uploadUrl, 'create'),
    'POST',
    JSON.stringify({ contentType }),
  )
  const { uploadId } = (await createResponse.json()) as { uploadId: string }
  const parts: R2UploadedPart[] = []
  let uploadedBytes = 0

  try {
    for (let start = 0, partNumber = 1; start < body.size; start += UPLOAD_PART_BYTES, partNumber++) {
      const partBody = body.slice(start, Math.min(start + UPLOAD_PART_BYTES, body.size))
      const partUrl = directUploadUrl(uploadUrl, 'part', { uploadId, partNumber: String(partNumber) })
      const part = await new Promise<R2UploadedPart>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', partUrl)
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress((uploadedBytes + event.loaded) / body.size)
          }
        }
        xhr.onload = () => {
          if (xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText) as R2UploadedPart)
            } catch {
              reject(new Error('The server returned an invalid upload-part response.'))
            }
          } else {
            reject(new Error(uploadError(xhr.status, xhr.responseText)))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'))
        xhr.send(partBody)
      })
      parts.push(part)
      uploadedBytes += partBody.size
      onProgress(uploadedBytes / body.size)
    }

    await checkedRequest(
      directUploadUrl(uploadUrl, 'complete', { uploadId }),
      'POST',
      JSON.stringify({ parts }),
    )
  } catch (error) {
    await fetch(directUploadUrl(uploadUrl, 'abort', { uploadId }), { method: 'DELETE' }).catch((abortError: unknown) =>
      console.error('Multipart abort failed:', abortError),
    )
    throw error
  }
}

export function AudioUpload() {
  const key = useField<string>({ path: 'fileKey' })
  const mime = useField<string>({ path: 'mimeType' })
  const size = useField<number>({ path: 'sizeBytes' })
  const duration = useField<number>({ path: 'durationSeconds' })
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState<string>('')

  async function doUpload(file: File) {
    setBusy(true)
    setFileName(file.name)
    try {
      const sourceType = audioContentType(file)
      if (!sourceType) {
        throw new Error('Choose an audio file (MP3, M4A, AAC, OGG, Opus, WAV, or audio WebM). Upload videos from Media.')
      }
      if (!file.size) throw new Error('The selected file is empty.')

      let body: Blob = file
      let seconds = 0
      let conversionFallback = false
      if (shouldConvertAudioToMp3(sourceType) && file.size <= MAX_CONVERT_BYTES) {
        setStatus('Converting to MP3…')
        try {
          const converted = await convertToMp3(file, (p) => setStatus(`Converting to MP3… ${Math.round(p * 100)}%`))
          body = converted.blob
          seconds = converted.seconds
        } catch (err) {
          conversionFallback = true
          setStatus(`MP3 conversion unavailable; uploading the original audio: ${err instanceof Error ? err.message : 'unknown conversion error'}`)
          seconds = await mediaDuration(file)
        }
      } else {
        seconds = await mediaDuration(file)
      }
      const contentType = body === file ? sourceType : 'audio/mpeg'
      setStatus('Preparing upload…')
      const res = await fetch('/svc/staff/uploads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contentType, size: body.size }),
      })
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'The upload could not start.')
      const { uploadUrl, key: fileKey, uploadType } = (await res.json()) as {
        uploadUrl: string
        key: string
        uploadType: 'presigned' | 'multipart'
      }

      setStatus('Uploading… 0%')
      const onProgress = (progress: number) => setStatus(`Uploading… ${Math.round(progress * 100)}%`)
      if (uploadType === 'multipart') {
        await uploadMultipart(uploadUrl, contentType, body, onProgress)
      } else {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('content-type', contentType)
          xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
          xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(uploadError(xhr.status, xhr.responseText))))
          xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'))
          xhr.send(body)
        })
      }
      key.setValue(fileKey)
      mime.setValue(contentType)
      size.setValue(body.size)
      duration.setValue(seconds)
      setStatus(
        conversionFallback
          ? 'Uploaded in the original audio format. Save the recording to keep it.'
          : 'Uploaded. Save the recording to keep it.',
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  function pickAndUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/aac,audio/mp4,audio/mpeg,audio/ogg,audio/opus,audio/wav,audio/webm,.aac,.m4a,.mp3,.ogg,.opus,.wav,.webm'
    input.onchange = () => { if (input.files?.[0]) doUpload(input.files[0]) }
    input.click()
  }

  return (
    <div style={{ marginBottom: 32, padding: 16, border: '1px solid var(--theme-elevation-150)', borderRadius: 8 }}>
      <h4 style={{ marginTop: 0 }}>Audio file</h4>
      {key.value ? <p>Current file: <code>{key.value}</code></p> : null}
      {fileName && !key.value ? <p style={{ fontSize: 14, color: 'var(--theme-elevation-500)' }}>{fileName}</p> : null}
      <div>
        <Button onClick={pickAndUpload} disabled={busy} buttonStyle="secondary" size="small">
          {busy ? status : key.value ? 'Replace audio' : 'Upload audio'}
        </Button>
      </div>
      {status && !busy ? <p role="status">{status}</p> : null}
      <p style={{ opacity: 0.7, fontSize: 13 }}>
        Audio up to 100 MB is converted to MP3 when supported. Larger files keep their original audio format; uploads can be up to 2 GB. Upload videos from Media.
      </p>
    </div>
  )
}
