import type { ReactNode } from 'react'

import '@/styles/site.css'
import { fontVariables } from '@/fonts'

// Pages only on the admin Worker (the teacher's live room). The public Worker refuses /teach.
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Live room · Arruhayn staff', robots: { index: false } }

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body>
        <header className="site-header" data-home="false" data-scrolled="false">
          <div className="wrap header-row">
            <a className="wordmark" href="/admin">
              <span className="wordmark-ar" lang="ar">
                الرُّحَين
              </span>
              <span className="wordmark-en">Staff · Live room</span>
            </a>
            <div className="header-actions">
              <a className="lang-switch" href="/admin/collections/classes">
                Back to classes
              </a>
            </div>
          </div>
        </header>
        <main id="content">{children}</main>
      </body>
    </html>
  )
}
