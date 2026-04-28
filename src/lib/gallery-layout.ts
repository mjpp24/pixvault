import type { CSSProperties } from 'react'

const SPACING_GAP: Record<string, number> = {
  compact:  2,
  standard: 8,
  spacious: 16,
}

export function getGapPx(gridSpacing: string | null | undefined): number {
  return SPACING_GAP[gridSpacing ?? 'standard'] ?? 8
}

export function getRoundClass(gridRoundness: string | null | undefined): string {
  if (gridRoundness === 'extra')   return 'rounded-2xl'
  if (gridRoundness === 'rounded') return 'rounded-lg'
  return ''
}

/** Layouts that use CSS Columns — photos flow at their own natural aspect ratio, zero borders */
export function isNaturalLayout(layout: string): boolean {
  return !layout || layout === 'classic-grid' || layout === 'film' || layout === 'duo' || layout === 'panoramic'
}

export function getLayoutContainerStyle(layout: string, gapPx: number): CSSProperties {
  const gap = `${gapPx}px`

  // Natural: CSS Columns — each photo at its own ratio, no cropping, no borders
  if (!layout || layout === 'classic-grid') return { columnCount: 3, columnGap: gap } as CSSProperties
  if (layout === 'film')                    return { columnCount: 4, columnGap: gap } as CSSProperties
  if (layout === 'duo')                     return { columnCount: 2, columnGap: gap } as CSSProperties
  if (layout === 'panoramic')               return { columnCount: 1, columnGap: gap } as CSSProperties

  // Fixed-ratio grid layouts
  const base: CSSProperties = { display: 'grid', gap }
  switch (layout) {
    case 'masonry':
    case 'magazine':
    case 'spotlight':
    case 'editorial':
    case 'mosaic':
    case 'gallery-wall': return { ...base, gridTemplateColumns: 'repeat(3, 1fr)', gridAutoFlow: 'dense' }
    default:             return { columnCount: 3, columnGap: gap } as CSSProperties
  }
}

export function getItemStyle(index: number, layout: string): CSSProperties {
  switch (layout) {
    case 'masonry': {
      const col = index % 3
      if (col === 0) return { aspectRatio: '2/3' }
      return { aspectRatio: '3/4' }
    }
    case 'magazine': {
      const pos = index % 4
      if (pos === 0) return { gridColumn: 'span 2', aspectRatio: '4/3' }
      return { aspectRatio: '4/5' }
    }
    case 'spotlight': {
      const pos = index % 4
      if (pos === 0) return { gridColumn: '1 / -1', aspectRatio: '16/7' }
      return { aspectRatio: '3/4' }
    }
    case 'editorial': {
      const pos = index % 5
      if (pos === 0) return { gridColumn: 'span 2', aspectRatio: '16/9' }
      if (pos === 1) return { aspectRatio: '4/5' }
      return { aspectRatio: '3/4' }
    }
    case 'mosaic': {
      const pos = index % 5
      if (pos === 0) return { gridColumn: 'span 2', aspectRatio: '4/3' }
      return { aspectRatio: '3/4' }
    }
    case 'gallery-wall': {
      const pos = index % 7
      if (pos === 0) return { gridColumn: 'span 2', aspectRatio: '4/3' }
      if (pos === 4) return { gridColumn: 'span 2', aspectRatio: '16/9' }
      return { aspectRatio: '3/4' }
    }
    default: return {}
  }
}
