import { getPayloadClient } from '@/lib/payload'
import { errorJson, staffUser } from '@/lib/staff'

// Downloads a collection as CSV for staff, using their own permissions. Columns are the ones the
// list shows by default. ?status= limits it to one status, as the list tabs do.
const SKIP = new Set(['users'])

function text(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(text).join('; ')
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    return String(v.title ?? v.name ?? v.term ?? v.email ?? v.label ?? v.id ?? JSON.stringify(v))
  }
  return String(value)
}

const cell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

export async function GET(request: Request) {
  const user = await staffUser(request)
  if (!user) return errorJson('Sign in first.', 401)
  const url = new URL(request.url)
  const slug = url.searchParams.get('collection') ?? ''
  const payload = await getPayloadClient()
  const collection = (payload.collections as Record<string, (typeof payload.collections)[keyof typeof payload.collections] | undefined>)[slug]
  if (!collection || SKIP.has(slug)) return errorJson('Unknown collection.', 404)

  const config = collection.config
  const columns = ['id', ...(config.admin?.defaultColumns ?? [config.admin?.useAsTitle ?? 'id'])].filter((c, i, a) => a.indexOf(c) === i)
  const status = url.searchParams.get('status')
  const result = await payload.find({
    collection: slug as never,
    where: status ? { status: { equals: status } } : undefined,
    pagination: false,
    depth: 1,
    user,
    overrideAccess: false,
  })
  const rows = [columns.join(','), ...result.docs.map((doc) => columns.map((c) => cell(text((doc as Record<string, unknown>)[c]))).join(','))]
  const stamp = new Date().toISOString().slice(0, 10)
  // The byte-order mark lets Excel read Arabic correctly.
  return new Response('﻿' + rows.join('\r\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="arruhayn-${slug}${status ? `-${status}` : ''}-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  })
}
