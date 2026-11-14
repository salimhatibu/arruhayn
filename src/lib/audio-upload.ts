const MIME_ALIASES: Record<string, string> = {
  'audio/x-m4a': 'audio/mp4',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
}

const SUPPORTED_MIME_TYPES = new Set([
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/opus',
  'audio/wav',
  'audio/webm',
])

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  aac: 'audio/aac',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  wav: 'audio/wav',
  webm: 'audio/webm',
}

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
}

export function normalizeAudioMimeType(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const mimeType = value.split(';', 1)[0].trim().toLowerCase()
  const normalized = MIME_ALIASES[mimeType] ?? mimeType
  return SUPPORTED_MIME_TYPES.has(normalized) ? normalized : undefined
}

export function audioContentType(file: { name: string; type: string }): string | undefined {
  const declaredType = file.type.split(';', 1)[0].trim().toLowerCase()
  if (declaredType.startsWith('video/')) return undefined

  const normalized = normalizeAudioMimeType(declaredType)
  if (normalized) return normalized
  if (declaredType.startsWith('audio/')) return undefined
  if (declaredType && declaredType !== 'application/octet-stream') return undefined

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_TYPES_BY_EXTENSION[extension]
}

export function shouldConvertAudioToMp3(mimeType: string): boolean {
  return ['audio/ogg', 'audio/opus', 'audio/wav', 'audio/webm'].includes(mimeType)
}

export function audioFileExtension(mimeType: string): string | undefined {
  return EXTENSIONS_BY_MIME_TYPE[mimeType]
}
