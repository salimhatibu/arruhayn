import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { hasRole } from '@/access/roles'
import { TeacherRoom } from '@/components/live/TeacherRoom'
import { realtimeConfigured } from '@/lib/realtimekit'
import { getPayloadClient } from '@/lib/payload'
import type { User } from '@/payload-types'

export default async function TeachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    return (
      <div className="wrap reading">
        <h1>Sign in to teach</h1>
        <p>
          Open the <Link href="/admin">staff area</Link> first, then come back to this page.
        </p>
      </div>
    )
  }
  const cls = await payload.findByID({ collection: 'classes', id: Number(id), depth: 1, disableErrors: true })
  if (!cls) notFound()
  const teacherId = typeof cls.teacher === 'object' ? cls.teacher?.id : cls.teacher
  if (!hasRole(user as User, 'admin') && teacherId !== user.id) {
    return (
      <div className="wrap reading">
        <h1>This isn&apos;t your class</h1>
        <p>Only the class&apos;s teacher or an admin can host it.</p>
      </div>
    )
  }
  return (
    <div className="wrap" style={{ maxWidth: 960 }}>
      <p className="small">
        <Link href={`/admin/collections/classes/${cls.id}`}>← Back to the class</Link>
      </p>
      <h1>{cls.title}</h1>
      {realtimeConfigured() ? (
        <TeacherRoom classId={cls.id} title={cls.title} status={cls.status} />
      ) : (
        <p className="notice">
          Live classes aren&apos;t set up yet. Add the RealtimeKit settings (RTK_ACCOUNT_ID, RTK_APP_ID, RTK_API_TOKEN) to the
          admin and public Workers. See docs/SETUP.md.
        </p>
      )}
    </div>
  )
}
