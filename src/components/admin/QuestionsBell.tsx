import Link from 'next/link'
import type { ServerProps } from 'payload'

import { hasRole } from '@/access/roles'

// Top bar: new questions waiting for a reviewer, with a count badge. Teachers don't see it.
export async function QuestionsBell({ payload, user }: ServerProps) {
  if (!hasRole(user as never, 'admin', 'reviewer')) return null
  const { totalDocs } = await payload.count({ collection: 'questions', where: { status: { equals: 'new' } }, overrideAccess: true })
  const label = totalDocs === 1 ? '1 new question' : `${totalDocs} new questions`
  return (
    <Link className="questions-bell" href="/admin/collections/questions?where[status][equals]=new" title={label} aria-label={label}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6a7.5 7.5 0 1 1 17-3.5Z" />
        <path d="M9.8 9.3a2.4 2.4 0 1 1 3.8 1.9c-.9.6-1.6 1-1.6 2.1m.1 3h.01" />
      </svg>
      {totalDocs ? <span className="questions-bell-count">{totalDocs > 99 ? '99+' : totalDocs}</span> : null}
    </Link>
  )
}
