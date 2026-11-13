// Server-side check of a Turnstile token from a public form.
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET
  if (!secret) return process.env.NODE_ENV === 'development'
  if (!token) return false
  const body = new FormData()
  body.set('secret', secret)
  body.set('response', token)
  if (ip) body.set('remoteip', ip)
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
    const data = (await res.json()) as { success?: boolean }
    return Boolean(data.success)
  } catch {
    return false
  }
}

export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA'
