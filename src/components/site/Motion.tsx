'use client'

import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// Page-wide motion: smooth, eased scrolling (Lenis), sections that fade up as they scroll into view,
// and telling the header whether the page has scrolled (it condenses) and whether this is the home
// page (it sits over the hero). Everything still works without JavaScript, and people who prefer
// reduced motion get the browser's own scrolling and no fades.

export function Motion(): null {
  const pathname = usePathname()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 })
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    })
    // Pause while the phone menu is open, and jump smoothly to in-page links.
    const menu = new MutationObserver(() =>
      document.documentElement.hasAttribute('data-menu-open') ? lenis.stop() : lenis.start(),
    )
    menu.observe(document.documentElement, { attributes: true, attributeFilter: ['data-menu-open'] })
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]')
      const target = link && document.querySelector(link.getAttribute('href') ?? '')
      if (target instanceof HTMLElement) {
        e.preventDefault()
        lenis.scrollTo(target, { offset: -88 })
      }
    }
    document.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(frame)
      menu.disconnect()
      document.removeEventListener('click', onClick)
      lenis.destroy()
    }
  }, [])

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
