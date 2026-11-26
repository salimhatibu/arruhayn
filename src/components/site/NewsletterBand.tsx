'use client'

import { useSyncExternalStore } from 'react'

// Hides the newsletter band once this browser has subscribed. The flag lives in localStorage,
// which the server cannot see, so the band renders on the server and disappears after hydration.
function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

function hasSubscribed() {
  try {
    return Boolean(localStorage.getItem('arruhayn-subscribed'))
  } catch {
    return false
  }
}

export function NewsletterBand({ children }: { children: React.ReactNode }) {
  const subscribed = useSyncExternalStore(subscribe, hasSubscribed, () => false)
  return subscribed ? null : <>{children}</>
}
