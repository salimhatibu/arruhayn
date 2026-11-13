// Rebuilds the full-text search index from every published fatwa and newsletter.
//
//   pnpm reindex                                   local dev database
//   CLOUDFLARE_ENV=admin NODE_ENV=production pnpm reindex   production
import config from '@payload-config'
import { sql } from '@payloadcms/db-d1-sqlite'
import { getPayload } from 'payload'

import { indexFatwa, indexNewsletter } from '../src/lib/search-index'

const payload = await getPayload({ config })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await (payload.db.drizzle as any).run(sql`DELETE FROM search_index`)

const fatwas = await payload.find({ collection: 'fatwas', where: { status: { equals: 'published' } }, pagination: false, depth: 0 })
for (const f of fatwas.docs) await indexFatwa(payload, f.id)
const issues = await payload.find({ collection: 'newsletters', where: { status: { equals: 'published' } }, pagination: false, depth: 0 })
for (const n of issues.docs) await indexNewsletter(payload, n.id)

payload.logger.info(`Indexed ${fatwas.docs.length} fatwas and ${issues.docs.length} newsletters`)
process.exit(0)
