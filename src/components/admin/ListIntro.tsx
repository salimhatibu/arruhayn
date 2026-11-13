import type { BeforeListServerProps } from 'payload'

import { LIST_ICONS } from './listMeta'

// Draws the collection's icon in the tile beside its list title.
export function ListIntro({ collectionSlug }: BeforeListServerProps) {
  const icon = LIST_ICONS[collectionSlug]
  if (!icon) return null
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#6b1f33' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='${icon}'/></svg>`
  return <style>{`.collection-list--${collectionSlug} .list-header__title::before { background-image: url("data:image/svg+xml,${encodeURIComponent(svg)}"); }`}</style>
}
