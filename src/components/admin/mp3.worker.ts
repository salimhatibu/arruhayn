// Encodes mono 16-bit PCM to MP3 off the main thread, so the admin page stays responsive.
import { Mp3Encoder } from '@breezystack/lamejs'

type Job = { samples: Float32Array; sampleRate: number; kbps: number }

self.onmessage = (event: MessageEvent<Job>) => {
  const { samples, sampleRate, kbps } = event.data
  const encoder = new Mp3Encoder(1, sampleRate, kbps)
  const chunks: Uint8Array[] = []
  const block = 1152 * 64
  for (let i = 0; i < samples.length; i += block) {
    const slice = samples.subarray(i, i + block)
    const pcm = new Int16Array(slice.length)
    for (let j = 0; j < slice.length; j++) {
      const s = Math.max(-1, Math.min(1, slice[j]))
      pcm[j] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    const out = encoder.encodeBuffer(pcm)
    if (out.length) chunks.push(new Uint8Array(out))
    if ((i / block) % 20 === 0) self.postMessage({ progress: i / samples.length })
  }
  const end = encoder.flush()
  if (end.length) chunks.push(new Uint8Array(end))
  self.postMessage({ done: new Blob(chunks as BlobPart[], { type: 'audio/mpeg' }) })
}
