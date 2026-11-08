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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 6h16v12H4V6Zm0 0 8 7 8-7" />
      </svg>
      {totalDocs ? <span className="questions-bell-count">{totalDocs > 99 ? '99+' : totalDocs}</span> : null}
    </Link>
  )
}
