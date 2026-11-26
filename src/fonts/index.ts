import localFont from 'next/font/local'

// Amiri, Amiri Quran, and Crimson Pro are the OFL-licensed files from the brand fonts folder,
// subset to Arabic and Latin. IBM Plex is used for small interface text.
//
// Every family is served from this folder. Nothing is fetched at build time: next/font/google
// downloads from Google while the site builds, and one bad reply there fails the whole build.

export const amiri = localFont({
  src: [
    { path: './amiri-400.woff2', weight: '400', style: 'normal' },
    { path: './amiri-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-amiri',
  display: 'swap',
  preload: true,
})

export const amiriQuran = localFont({
  src: [{ path: './amiri-quran-400.woff2', weight: '400', style: 'normal' }],
  variable: '--font-amiri-quran',
  display: 'swap',
  preload: false,
})

export const crimson = localFont({
  src: [
    { path: './crimson-pro-var.woff2', weight: '200 900', style: 'normal' },
    { path: './crimson-pro-italic-var.woff2', weight: '200 900', style: 'italic' },
  ],
  variable: '--font-crimson',
  display: 'swap',
})

// Google serves Plex Sans as one variable file covering the whole weight range, so 400, 500,
// and 600 all come out of this one.
export const plex = localFont({
  src: [{ path: './plex-sans-var.woff2', weight: '400 600', style: 'normal' }],
  variable: '--font-plex',
  display: 'swap',
})

export const plexArabic = localFont({
  src: [
    { path: './plex-sans-ar-400.woff2', weight: '400', style: 'normal' },
    { path: './plex-sans-ar-500.woff2', weight: '500', style: 'normal' },
    { path: './plex-sans-ar-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-plex-ar',
  display: 'swap',
  preload: false,
})

// Datelines and bylines, set like newspaper type.
export const plexMono = localFont({
  src: [
    { path: './plex-mono-400.woff2', weight: '400', style: 'normal' },
    { path: './plex-mono-500.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
})

export const fontVariables = [amiri, amiriQuran, crimson, plex, plexArabic, plexMono].map((f) => f.variable).join(' ')
