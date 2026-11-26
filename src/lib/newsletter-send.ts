import type { Payload } from 'payload'

import type { Newsletter, Subscriber } from '@/payload-types'
import type { Locale } from '@/i18n/dictionary'
import { confirmEmail, issueEmail, lexicalToEmailHtml } from '@/lib/email-templates'
import { emailConfigured, sendMail, sendMailBatch, type Mail } from '@/lib/email'
import { lexicalToText } from '@/lib/lexical'

const PAGE = 200

const siteUrl = () => (process.env.PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const localeOf = (subscriber: Pick<Subscriber, 'language'>): Locale => (subscriber.language === 'ar' ? 'ar' : 'en')

export const confirmUrl = (token: string) => `${siteUrl()}/svc/subscribe/confirm?t=${encodeURIComponent(token)}`
export const unsubscribeUrl = (token: string) => `${siteUrl()}/svc/unsubscribe?t=${encodeURIComponent(token)}`

// Mail apps show their own unsubscribe button when these are present, and spam filters expect
// them on anything bulk.
const unsubscribeHeaders = (token: string) => ({
  'List-Unsubscribe': `<${unsubscribeUrl(token)}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
})

// Is the site allowed to send right now? Both the API key and the admin's switch must be on.
export async function sendingEnabled(payload: Payload): Promise<boolean> {
  if (!emailConfigured()) return false
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  return Boolean(settings.emailSending)
}

// Asks a new subscriber to confirm. Records the time so the sweep below never asks twice.
export async function sendConfirmation(payload: Payload, subscriber: Subscriber): Promise<boolean> {
  if (!subscriber.confirmToken) return false
  const { subject, html, text } = confirmEmail({
    locale: localeOf(subscriber),
    name: subscriber.name,
    confirmUrl: confirmUrl(subscriber.confirmToken),
  })
  try {
    await sendMail({ to: subscriber.email, subject, html, text })
  } catch (error) {
    payload.logger.error({ msg: 'Confirmation email failed', email: subscriber.email, error: String(error) })
    return false
  }
  await payload.update({
    collection: 'subscribers',
    id: subscriber.id,
    overrideAccess: true,
    data: { confirmSentAt: new Date().toISOString() },
  })
  return true
}

// People who signed up while sending was off are still waiting to be asked. Once it is on, this
// catches them up.
export async function sendPendingConfirmations(payload: Payload): Promise<number> {
  const waiting = await payload.find({
    collection: 'subscribers',
    where: {
      and: [{ status: { equals: 'pending' } }, { confirmSentAt: { exists: false } }, { confirmToken: { exists: true } }],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  let sent = 0
  for (const subscriber of waiting.docs) {
    if (await sendConfirmation(payload, subscriber)) sent++
  }
  return sent
}

async function confirmedSubscribers(payload: Payload): Promise<Subscriber[]> {
  const all: Subscriber[] = []
  for (let page = 1; ; page++) {
    const found = await payload.find({
      collection: 'subscribers',
      where: { status: { equals: 'confirmed' } },
      limit: PAGE,
      page,
      depth: 0,
      overrideAccess: true,
    })
    all.push(...found.docs)
    if (!found.hasNextPage) return all
  }
}

// The issue reads the same for everyone in a language, so it is rendered once per language with
// a stand-in for the unsubscribe link, then the link is swapped in for each subscriber.
const UNSUBSCRIBE_SLOT = 'https://unsubscribe.invalid/SLOT'

function issueMails(issue: Record<Locale, Newsletter>, subscribers: Subscriber[]): Mail[] {
  const rendered = {} as Record<Locale, { subject: string; html: string; text: string }>
  const mails: Mail[] = []
  for (const subscriber of subscribers) {
    if (!subscriber.unsubscribeToken) continue
    const locale = localeOf(subscriber)
    if (!rendered[locale]) {
      const doc = issue[locale]
      rendered[locale] = issueEmail({
        locale,
        name: null,
        issue: doc.issue,
        title: doc.title,
        summary: doc.summary,
        bodyHtml: lexicalToEmailHtml(doc.body),
        bodyText: lexicalToText(doc.body),
        readUrl: `${siteUrl()}/${locale}/newsletters/${doc.issue}`,
        unsubscribeUrl: UNSUBSCRIBE_SLOT,
      })
    }
    const { subject, html, text } = rendered[locale]
    const link = unsubscribeUrl(subscriber.unsubscribeToken)
    mails.push({
      to: subscriber.email,
      subject,
      html: html.replaceAll(UNSUBSCRIBE_SLOT, link),
      text: text.replaceAll(UNSUBSCRIBE_SLOT, link),
      headers: unsubscribeHeaders(subscriber.unsubscribeToken),
    })
  }
  return mails
}

// Emails any issue that is published but has not gone out yet. The issue is stamped before the
// send starts: a half-finished run leaves people without an issue, which an admin can fix by
// clearing "Emailed at", while a repeated run would mail everyone twice.
export async function sendDueIssues(payload: Payload): Promise<{ issues: number; sent: number; failed: number }> {
  const due = await payload.find({
    collection: 'newsletters',
    where: { and: [{ status: { equals: 'published' } }, { emailedAt: { exists: false } }] },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  })
  let sent = 0
  let failed = 0
  for (const issue of due.docs) {
    await payload.update({
      collection: 'newsletters',
      id: issue.id,
      overrideAccess: true,
      data: { emailedAt: new Date().toISOString() },
    })
    const subscribers = await confirmedSubscribers(payload)
    if (!subscribers.length) continue
    const [en, ar] = await Promise.all([
      payload.findByID({ collection: 'newsletters', id: issue.id, locale: 'en', depth: 0, overrideAccess: true }),
      payload.findByID({ collection: 'newsletters', id: issue.id, locale: 'ar', depth: 0, overrideAccess: true }),
    ])
    const result = await sendMailBatch(issueMails({ en, ar }, subscribers))
    sent += result.sent
    failed += result.failed
    payload.logger.info({ msg: 'Newsletter issue emailed', issue: issue.issue, ...result })
  }
  return { issues: due.docs.length, sent, failed }
}
