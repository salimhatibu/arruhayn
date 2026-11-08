import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google'
import localFont from 'next/font/local'

// Amiri, Amiri Quran, and Crimson Pro are the OFL-licensed files from the brand fonts folder,
// subset to Arabic and Latin. IBM Plex is used for small interface text.

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

export const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
})

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-ar',
  display: 'swap',
  preload: false,
})

// Datelines and bylines, set like newspaper type.
export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const fontVariables = [amiri, amiriQuran, crimson, plex, plexArabic, plexMono].map((f) => f.variable).join(' ')
