'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

// A value kept in this browser's localStorage, shared by every component that reads the same key.
// The server render always sees the fallback, so there is no hydration mismatch. Storage errors
// (private windows, blocked storage) fall back silently.

const eventName = (key: string) => `local:${key}`

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function useLocalValue<T>(key: string, fallback: T): [T, (value: T | null) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      window.addEventListener('storage', onChange)
      window.addEventListener(eventName(key), onChange)
      return () => {
        window.removeEventListener('storage', onChange)
        window.removeEventListener(eventName(key), onChange)
      }
    },
    [key],
  )
  const raw = useSyncExternalStore(subscribe, () => read(key), (): string | null => null)
  const value = useMemo(() => {
    if (raw === null) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw])
  const set = useCallback(
    (next: T | null) => {
      try {
        if (next === null) localStorage.removeItem(key)
        else localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Storage unavailable.
      }
      window.dispatchEvent(new Event(eventName(key)))
    },
    [key],
  )
  return [value, set]
}
