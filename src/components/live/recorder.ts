'use client'

// Records a live class on the teacher's own computer. Nothing is uploaded.
//
// - The audio file mixes the teacher's microphone with every speaker and any shared-screen sound.
// - In "audio and screen" mode, each screen share is also saved as its own video file
//   (screen-1, screen-2, …), so changing presenter never breaks a recording.
// - Chunks are written to disk every 10 seconds. In Chrome and Edge they go straight into a folder
//   the teacher picks; in other browsers they are kept in IndexedDB and saved when recording stops,
//   or recovered after a crash.

const CHUNK_MS = 10_000
const DB = 'arruhayn-recordings'

type Sink = { write: (blob: Blob) => Promise<void>; close: () => Promise<void> }

function pickType(candidates: string[]) {
  return candidates.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? ''
}
const AUDIO_TYPE = () => pickType(['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'])
const VIDEO_TYPE = () => pickType(['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'])
const ext = (type: string) => (type.includes('mp4') ? (type.startsWith('audio') ? 'm4a' : 'mp4') : type.includes('ogg') ? 'ogg' : 'webm')

export const canWriteToFolder = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window

// IndexedDB fallback: chunks are stored per file and assembled when saving.
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('chunks', { autoIncrement: true }).createIndex('file', 'file')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSink(file: string, type: string): Promise<Sink> {
  const db = await openDb()
  return {
    write: (blob) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('chunks', 'readwrite')
        tx.objectStore('chunks').add({ file, type, blob, at: Date.now() })
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
    close: async () => {
      await downloadStored(file)
    },
  }
}

// Files left in IndexedDB, for example after the browser closed mid-class.
export async function storedRecordings(): Promise<string[]> {
  if (typeof indexedDB === 'undefined') return []
  const db = await openDb()
  return new Promise((resolve) => {
    const req = db.transaction('chunks').objectStore('chunks').index('file').openKeyCursor(null, 'nextunique')
    const files: string[] = []
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return resolve(files)
      files.push(cursor.key as string)
      cursor.continue()
    }
    req.onerror = () => resolve([])
  })
}

export async function downloadStored(file: string) {
  const db = await openDb()
  const rows: { file: string; type: string; blob: Blob }[] = await new Promise((resolve, reject) => {
    const req = db.transaction('chunks').objectStore('chunks').index('file').getAll(file)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  if (!rows.length) return
  const blob = new Blob(rows.map((r) => r.blob), { type: rows[0].type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000)
  // Remove the chunks once saved.
  await new Promise<void>((resolve) => {
    const tx = db.transaction('chunks', 'readwrite')
    const store = tx.objectStore('chunks')
    const keys = store.index('file').getAllKeys(file)
    keys.onsuccess = () => keys.result.forEach((k) => store.delete(k))
    tx.oncomplete = () => resolve()
  })
}

export type RecorderMode = 'audio' | 'screen'

export class LocalRecorder {
  private ctx = new AudioContext()
  private dest = this.ctx.createMediaStreamDestination()
  private sources = new Map<string, MediaStreamAudioSourceNode>()
  private audioRec?: MediaRecorder
  private videoRec?: MediaRecorder
  private videoTrackId?: string
  private videoPart = 0
  private dir?: FileSystemDirectoryHandle
  private pending: Promise<void>[] = []
  bytes = 0
  startedAt = 0
  readonly base: string

  constructor(
    readonly mode: RecorderMode,
    title: string,
    private onChange: () => void,
  ) {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
    this.base = `${stamp}-${title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)}`
  }

  // Must be called from a click, because it may ask the teacher where to save.
  async start() {
    if (canWriteToFolder()) {
      this.dir = await (window as unknown as { showDirectoryPicker: (o: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      })
    }
    await this.ctx.resume()
    const type = AUDIO_TYPE()
    this.audioRec = await this.record(this.dest.stream, `${this.base}-audio.${ext(type)}`, type)
    this.startedAt = Date.now()
  }

  private async sink(file: string, type: string): Promise<Sink> {
    if (this.dir) {
      const handle = await this.dir.getFileHandle(file, { create: true })
      const writable = await handle.createWritable()
      return { write: (b) => writable.write(b), close: () => writable.close() }
    }
    return idbSink(file, type)
  }

  private async record(stream: MediaStream, file: string, type: string) {
    const sink = await this.sink(file, type)
    const rec = new MediaRecorder(stream, { mimeType: type || undefined, audioBitsPerSecond: 64_000 })
    // Writes are chained so chunks land in order.
    let chain = Promise.resolve()
    rec.ondataavailable = (e) => {
      if (!e.data.size) return
      this.bytes += e.data.size
      chain = chain.then(() => sink.write(e.data))
      this.onChange()
    }
    rec.onstop = () => {
      this.pending.push(chain.then(() => sink.close()))
    }
    rec.start(CHUNK_MS)
    return rec
  }

  // Keeps the mix in step with who is speaking. Call whenever the room changes.
  setAudioTracks(tracks: MediaStreamTrack[]) {
    const live = new Set(tracks.filter((t) => t.readyState === 'live').map((t) => t.id))
    for (const [id, node] of this.sources) {
      if (!live.has(id)) {
        node.disconnect()
        this.sources.delete(id)
      }
    }
    for (const track of tracks) {
      if (!live.has(track.id) || this.sources.has(track.id)) continue
      const node = this.ctx.createMediaStreamSource(new MediaStream([track]))
      node.connect(this.dest)
      this.sources.set(track.id, node)
    }
  }

  // Starts a new screen file when a share begins, and closes it when the share ends.
  async setScreenTrack(track?: MediaStreamTrack) {
    if (this.mode !== 'screen') return
    if (track?.id === this.videoTrackId) return
    if (this.videoRec && this.videoRec.state !== 'inactive') this.videoRec.stop()
    this.videoRec = undefined
    this.videoTrackId = track?.id
    if (!track) return
    this.videoPart += 1
    const type = VIDEO_TYPE()
    const stream = new MediaStream([track, ...this.dest.stream.getAudioTracks()])
    this.videoRec = await this.record(stream, `${this.base}-screen-${this.videoPart}.${ext(type)}`, type)
  }

  async stop() {
    if (this.videoRec && this.videoRec.state !== 'inactive') this.videoRec.stop()
    if (this.audioRec && this.audioRec.state !== 'inactive') this.audioRec.stop()
    // Give onstop handlers a moment to queue their final writes.
    await new Promise((r) => setTimeout(r, 300))
    await Promise.all(this.pending)
    this.sources.forEach((n) => n.disconnect())
    await this.ctx.close().catch(() => {})
  }

  get savedTo() {
    return this.dir?.name
  }
}
