import type { EmailAdapter } from 'payload'

// Mail goes out through Resend's HTTP API. Workers cannot open SMTP sockets, and Cloudflare's own
// Email Service is for transactional mail only, so it may not carry the newsletter.

const SEND_ONE = 'https://api.resend.com/emails'
const SEND_BATCH = 'https://api.resend.com/emails/batch'
// Resend takes at most 100 messages per batch call.
const BATCH_SIZE = 100

export type Mail = {
  to: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
}

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY)

// EMAIL_FROM is written the way mail clients show it: Arruhayn <salam@example.com>
export function emailFrom(): { name: string; address: string } {
  const raw = process.env.EMAIL_FROM?.trim() || 'Arruhayn <onboarding@resend.dev>'
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/)
  return match ? { name: match[1].trim() || 'Arruhayn', address: match[2].trim() } : { name: 'Arruhayn', address: raw }
}

const fromHeader = () => {
  const { name, address } = emailFrom()
  return `${name} <${address}>`
}

const toResend = (mail: Mail) => ({
  from: fromHeader(),
  to: [mail.to],
  subject: mail.subject,
  html: mail.html,
  text: mail.text,
  ...(mail.headers ? { headers: mail.headers } : {}),
  ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
})

async function post(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend replied ${res.status}: ${detail.slice(0, 300)}`)
  }
}

export async function sendMail(mail: Mail): Promise<void> {
  if (!emailConfigured()) throw new Error('Email is not set up: RESEND_API_KEY is missing.')
  await post(SEND_ONE, toResend(mail))
}

// Sends in batches of 100. A batch that fails is counted and the rest still go out, so one bad
// address cannot stop an issue reaching everyone else.
export async function sendMailBatch(mails: Mail[]): Promise<{ sent: number; failed: number }> {
  if (!emailConfigured()) throw new Error('Email is not set up: RESEND_API_KEY is missing.')
  let sent = 0
  let failed = 0
  for (let i = 0; i < mails.length; i += BATCH_SIZE) {
    const slice = mails.slice(i, i + BATCH_SIZE)
    try {
      await post(SEND_BATCH, slice.map(toResend))
      sent += slice.length
    } catch {
      failed += slice.length
    }
  }
  return { sent, failed }
}

// Payload's own mail — password resets, and anything it adds later — goes through the same sender.
export const resendAdapter: EmailAdapter = () => {
  const { name, address } = emailFrom()
  return {
    name: 'resend',
    defaultFromAddress: address,
    defaultFromName: name,
    sendEmail: async (message) => {
      const to = [message.to]
        .flat()
        .map((entry) => (typeof entry === 'string' ? entry : entry?.address))
        .filter((entry): entry is string => Boolean(entry))
      if (!to.length) return
      const text = typeof message.text === 'string' ? message.text : ''
      const html = typeof message.html === 'string' ? message.html : text
      for (const address of to) {
        await sendMail({ to: address, subject: message.subject ?? '', html, text: text || html.replace(/<[^>]+>/g, ' ') })
      }
    },
  }
}
