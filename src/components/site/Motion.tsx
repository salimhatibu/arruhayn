'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// Page-wide motion: fades sections in as they scroll into view, and tells the header whether the
// page has scrolled (it condenses) and whether this is the home page (it sits over the hero).
// Everything is visible without JavaScript and for people who prefer reduced motion.

export function Motion(): null {
  const pathname = usePathname()

  useEffect(() => {
    const header = document.getElementById('site-header')
    header?.setAttribute('data-home', String(/^\/(en|ar)\/?$/.test(pathname ?? '')))
    const onScroll = () => header?.setAttribute('data-scrolled', String(window.scrollY > 24))
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-shown])')]
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Also show anything scrolled past too quickly to have been seen intersecting.
          if (!entry.isIntersecting && entry.boundingClientRect.top > 0) continue
          entry.target.setAttribute('data-shown', '')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    for (const el of items) {
      // Only hide what is still below the fold, so nothing already on screen flickers.
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.setAttribute('data-hidden', '')
        observer.observe(el)
      }
    }
    return () => observer.disconnect()
  }, [pathname])

  return null
}
