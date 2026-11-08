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
        <div className="topbar" />
        <main id="content">{children}</main>
      </body>
    </html>
  )
}
