import type { ServerProps } from 'payload'

import { formatHijri, toHijri, utcDay } from '@/lib/hijri'

// The top of the admin dashboard, set like a type specimen: a greeting, the date in both
// calendars, and the numbers that matter today.
export async function DashboardIntro({ payload, user }: ServerProps) {
  const published = { status: { equals: 'published' } } as const
  const [fatwas, questions, issues, recordings, classes] = await Promise.all([
    payload.count({ collection: 'fatwas', where: published, overrideAccess: true }),
    payload.count({ collection: 'questions', where: { status: { equals: 'new' } }, overrideAccess: true }),
    payload.count({ collection: 'newsletters', where: published, overrideAccess: true }),
    payload.count({ collection: 'recordings', where: published, overrideAccess: true }),
    payload.count({
      collection: 'classes',
      where: { and: [{ status: { equals: 'scheduled' } }, { startsAt: { greater_than: new Date().toISOString() } }] },
      overrideAccess: true,
    }),
  ])
  const name = ((user as { name?: string } | undefined)?.name ?? '').split(' ')[0]
  const today = utcDay(new Date())
  const stats: [number, string][] = [
    [fatwas.totalDocs, 'Fatwas published'],
    [questions.totalDocs, 'Questions waiting'],
    [issues.totalDocs, 'Newsletter issues'],
    [recordings.totalDocs, 'Recordings'],
    [classes.totalDocs, 'Classes ahead'],
  ]
  return (
    <section className="desk-intro">
      <p className="desk-kicker">
        <span className="desk-rule" aria-hidden="true" />
        Arruhayn staff desk · {formatHijri(toHijri(today, []), 'en')}
      </p>
      <h1 className="desk-title">
        Assalāmu ʿalaykum{name ? ',' : ''}
        <br />
        <em>{name || 'welcome back'}.</em>
      </h1>
      <p className="desk-lede">Everything that goes on the site starts here: answer questions, publish fatwas and newsletters, and run the classes.</p>
      <dl className="desk-stats">
        {stats.map(([n, label]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{String(n).padStart(2, '0')}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
