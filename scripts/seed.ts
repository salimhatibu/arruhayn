// Loads the starter content in content/ and creates the first admin.
//
//   pnpm seed you@example.com "Your Name"            local dev database
//   CLOUDFLARE_ENV=admin NODE_ENV=production pnpm seed you@example.com "Your Name"   production
//
// Set SEED_SAMPLES=1 (local only) to also create clearly marked sample fatwas, newsletters, news,
// classes, and a scholar for trying the site out. Never use it on production.
import config from '@payload-config'
import { readFileSync } from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import { textToLexical } from '../src/lib/lexical'

type Bi = { en: string; ar: string }
const read = <T>(file: string): T => JSON.parse(readFileSync(path.resolve(process.cwd(), 'content', file), 'utf8'))

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const samples = process.env.SEED_SAMPLES === '1'
const email = (args[0] ?? process.env.DEV_STAFF_EMAIL ?? '').toLowerCase()
const name = args[1] ?? 'Site admin'

if (samples && process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to create sample content in production.')
}

const payload = await getPayload({ config })

async function upsert<T extends 'topics' | 'glossary' | 'guides'>(
  collection: T,
  where: Record<string, unknown>,
  en: Record<string, unknown>,
  ar: Record<string, unknown> | ((saved: Record<string, unknown>) => Record<string, unknown>),
) {
  const existing = await payload.find({ collection, where: where as never, limit: 1, depth: 0 })
  const doc = existing.docs[0]
    ? await payload.update({ collection, id: existing.docs[0].id, locale: 'en', data: en as never })
    : await payload.create({ collection, locale: 'en', data: en as never })
  const arData = typeof ar === 'function' ? ar(doc as unknown as Record<string, unknown>) : ar
  await payload.update({ collection, id: doc.id, locale: 'ar', data: arData as never })
  return doc
}

// Staff
if (email) {
  const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  if (!found.docs.length) {
    await payload.create({ collection: 'users', data: { email, name, roles: ['admin', 'reviewer', 'teacher'] } })
    payload.logger.info(`Created admin ${email}`)
  }
}

// Topics
const topics = read<{ slug: string; order: number; name: Bi; description: Bi; searchWords: string[] }[]>('topics.json')
const topicIds: Record<string, number> = {}
for (const t of topics) {
  const doc = await upsert(
    'topics',
    { slug: { equals: t.slug } },
    { slug: t.slug, order: t.order, name: t.name.en, description: t.description.en, searchWords: t.searchWords },
    { name: t.name.ar, description: t.description.ar },
  )
  topicIds[t.slug] = doc.id as number
}
for (const [a, b] of [['mahr', 'contract'], ['talaq', 'khul'], ['talaq', 'annulment'], ['talaq', 'iddah'], ['iddah', 'custody']]) {
  const ra = await payload.findByID({ collection: 'topics', id: topicIds[a], depth: 0 })
  const related = new Set([...(ra.related ?? []).map((r) => (typeof r === 'object' ? r.id : r)), topicIds[b]])
  await payload.update({ collection: 'topics', id: topicIds[a], data: { related: [...related] } })
}
payload.logger.info(`Seeded ${topics.length} topics`)

// Glossary
const glossary = read<{ term: Bi; spellings: string[]; definition: Bi }[]>('glossary.json')
for (const g of glossary) {
  await upsert(
    'glossary',
    { term: { equals: g.term.en } },
    { term: g.term.en, spellings: g.spellings, definition: g.definition.en },
    { term: g.term.ar, definition: g.definition.ar },
  )
}
payload.logger.info(`Seeded ${glossary.length} glossary terms`)

// Guides: step titles only. Reviewers write the text before publishing, except the checklist,
// which is usable as it is.
const guides = read<{ slug: string; type: 'article' | 'checklist' | 'path'; title: Bi; summary: Bi; steps: { title: Bi }[] }[]>('guides.json')
for (const [i, g] of guides.entries()) {
  const doc = await upsert(
    'guides',
    { slug: { equals: g.slug } },
    {
      slug: g.slug,
      type: g.type,
      order: i + 1,
      title: g.title.en,
      summary: g.summary.en,
      status: g.type === 'checklist' ? 'published' : 'draft',
      steps: g.steps.map((s) => ({ title: s.title.en })),
    },
    (saved) => ({
      title: g.title.ar,
      summary: g.summary.ar,
      steps: ((saved.steps as { id: string }[]) ?? []).map((s, j) => ({ id: s.id, title: g.steps[j].title.ar })),
    }),
  )
  void doc
}
payload.logger.info(`Seeded ${guides.length} guides`)

if (samples) await seedSamples()

payload.logger.info('Seed finished')
process.exit(0)

async function seedSamples() {
  const SAMPLE = '[Sample] '
  const scholar = await payload.create({
    collection: 'scholars',
    locale: 'en',
    data: { name: `${SAMPLE}Example Scholar`, bio: 'A placeholder scholar for trying the site out. Delete before launch.' },
  })
  await payload.update({ collection: 'scholars', id: scholar.id, locale: 'ar', data: { name: '[نموذج] شيخ للتجربة', bio: 'شيخ افتراضي لتجربة الموقع، يُحذف قبل الإطلاق.' } })

  const fatwas: [string, string, string, Bi, string][] = [
    ['wali', 'Marrying without a guardian', 'Is a marriage valid if the woman marries without her wali?', { en: 'Sample answer text. Replace this with a real, reviewed answer before launch.', ar: 'نص جواب للتجربة، يُستبدل بجواب حقيقي مراجع قبل الإطلاق.' }, 'ما حكم النكاح بغير ولي؟'],
    ['mahr', 'Delaying part of the mahr', 'Can part of the mahr be deferred until later?', { en: 'Sample answer text about the dowry. Replace before launch.', ar: 'نص تجريبي عن الصداق، يُستبدل قبل الإطلاق.' }, 'هل يجوز تأجيل بعض المهر؟'],
    ['talaq', 'Divorce pronounced in anger', 'What is the ruling on a talaq said while very angry?', { en: 'Sample answer text. Replace before launch.', ar: 'نص جواب للتجربة.' }, 'ما حكم الطلاق في حال الغضب الشديد؟'],
    ['iddah', 'Leaving the house during iddah', 'May a widow leave her house during the iddah?', { en: 'Sample answer text. Replace before launch.', ar: 'نص جواب للتجربة.' }, 'هل للمعتدة من وفاة أن تخرج من بيتها؟'],
  ]
  for (const [topic, title, question, answer, questionAr] of fatwas) {
    const doc = await payload.create({
      collection: 'fatwas',
      locale: 'en',
      data: {
        title: SAMPLE + title,
        question,
        answer: textToLexical(answer.en) as never,
        topics: [topicIds[topic]],
        scholar: scholar.id,
        status: 'published',
        sources: [{ reference: 'Sample reference' }],
      },
    })
    await payload.update({
      collection: 'fatwas',
      id: doc.id,
      locale: 'ar',
      data: {
        title: '[نموذج] ' + questionAr,
        question: questionAr,
        answer: textToLexical(answer.ar) as never,
        sources: (doc.sources ?? []).map((src) => ({ id: src.id, reference: 'مرجع للتجربة' })),
      },
    })
  }

  const issue = await payload.create({
    collection: 'newsletters',
    locale: 'en',
    data: {
      issue: 1,
      title: `${SAMPLE}Rights of the wife upon the husband`,
      summary: 'A sample issue for trying out the newsletter pages.',
      body: textToLexical('This is a sample newsletter.\n\nWrite real issues in the admin under Publishing → Newsletters.') as never,
      status: 'published',
    },
  })
  await payload.update({ collection: 'newsletters', id: issue.id, locale: 'ar', data: { title: '[نموذج] حقوق الزوجة على زوجها', summary: 'عدد تجريبي.' } })

  await payload.create({
    collection: 'news',
    locale: 'en',
    data: { title: `${SAMPLE}The site is being set up`, summary: 'Sample news item.', status: 'published', date: new Date().toISOString() },
  })

  const admin = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  if (admin.docs[0]) {
    const start = new Date(Date.now() + 2 * 86400000)
    start.setUTCHours(17, 0, 0, 0)
    await payload.create({
      collection: 'classes',
      locale: 'en',
      data: { title: `${SAMPLE}Fiqh of nikah, lesson 1`, teacher: admin.docs[0].id, startsAt: start.toISOString(), durationMinutes: 90 },
    })
  }
  payload.logger.info('Created sample content')
}
