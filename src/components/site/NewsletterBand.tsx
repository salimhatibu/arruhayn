'use client'

import { useEffect, useState } from 'react'

export function NewsletterBand({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    try { if (localStorage.getItem('arruhayn-subscribed')) setHidden(true) } catch {}
    const handler = () => {
      try { if (localStorage.getItem('arruhayn-subscribed')) setHidden(true) } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  if (hidden) return null
  return <>{children}</>
}
