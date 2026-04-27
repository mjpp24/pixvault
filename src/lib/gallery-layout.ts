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

export function getLayoutContainerStyle(layout: string, gapPx: number): CSSProperties {
  const gap = `${gapPx}px`
  const base: CSSProperties = { display: 'grid', gap }
  switch (layout) {
    case 'duo':          return { ...base, gridTemplateColumns: 'repeat(2, 1fr)' }
    case 'panoramic':   return { ...base, gridTemplateColumns: '1fr' }
    case 'film':         return { ...base, gridTemplateColumns: 'repeat(4, 1fr)' }
    case 'masonry':
    case 'magazine':
    case 'spotlight':
    case 'editorial':
    case 'mosaic':
    case 'gallery-wall': return { ...base, gridTemplateColumns: 'repeat(3, 1fr)', gridAutoFlow: 'dense' }
    default:             return { ...base, gridTemplateColumns: 'repeat(3, 1fr)' } // classic-grid
  }
}

export function getItemStyle(index: number, layout: string): CSSProperties {
  switch (layout) {
    case 'masonry': {
      const col = index % 3
      if (col === 0) return { aspectRatio: '2/3' }
      if (col === 1) return { aspectRatio: '4/3' }
      return { aspectRatio: '1' }
    }
    case 'magazine': {
      const pos = index % 4
      if (pos === 0) return { gridColumn: 'span 2', aspectRatio: '4/3' }
      return { aspectRatio: '4/5' }
    }
    case 'spotlight': {
      const pos = index % 4
      if (pos === 0) return { gridColumn: '1 / -1', aspectRatio: '16/7' }
      return { aspectRatio: '1' }
    }
    case 'editorial': {
      const pos = index % 5
      if (pos === 0) return { gridColumn: 'span 2', aspectRatio: '16/9' }
      if (pos === 1) return { aspectRatio: '4/5' }
      return { aspectRatio: '1' }
    }
    case 'mosaic': {
      const pos = index % 5
      if (pos === 0) return { gridColumn: 'span 2', aspectRatio: '4/3' }
      return { aspectRatio: '1' }
    }
    case 'gallery-wall': {
      const pos = index % 7
      if (pos === 0) return { gridColumn: 'span 2', aspectRatio: '4/3' }
      if (pos === 4) return { gridColumn: 'span 2', aspectRatio: '16/9' }
      return { aspectRatio: '1' }
    }
    case 'panoramic': return { aspectRatio: '21/9' }
    case 'film':      return { aspectRatio: '3/4' }
    case 'duo':       return { aspectRatio: '1' }
    default:          return { aspectRatio: '1' } // classic-grid
  }
}
