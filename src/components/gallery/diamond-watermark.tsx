'use client'

import { useId } from 'react'

/**
 * Diamond-crosshatch + filename + PREVIEW watermark overlay.
 * Identical SVG pattern used in both the gallery grid and the lightbox.
 */
export function DiamondWatermark({ filename }: { filename?: string }) {
  const rawId = useId()
  const pid = 'wm' + rawId.replace(/[^a-zA-Z0-9]/g, '')
  const label = filename ? filename.replace(/\.[^.]+$/, '') : 'PREVIEW'

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={pid}
          x="0" y="0"
          width="200" height="200"
          patternUnits="userSpaceOnUse"
        >
          {/* Diamond crosshatch — NW→SE */}
          <line x1="0"   y1="0"   x2="200" y2="200" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          {/* Diamond crosshatch — NE→SW */}
          <line x1="200" y1="0"   x2="0"   y2="200" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          {/* Seamless edge continuations */}
          <line x1="0"   y1="0"   x2="-200" y2="200" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          <line x1="0"   y1="0"   x2="400"  y2="200" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          <line x1="0"   y1="200" x2="200"  y2="0"   stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          <line x1="0"   y1="200" x2="400"  y2="0"   stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />

          {/* Filename — rotated along the diagonal */}
          <text
            x="100" y="88"
            textAnchor="middle"
            fontSize="9"
            fill="rgba(255,255,255,0.30)"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="700"
            letterSpacing="1.2"
            transform="rotate(-45 100 88)"
          >
            {label}
          </text>

          {/* PREVIEW — larger, bolder */}
          <text
            x="100" y="108"
            textAnchor="middle"
            fontSize="15"
            fill="rgba(255,255,255,0.26)"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="900"
            letterSpacing="5"
            transform="rotate(-45 100 108)"
          >
            PREVIEW
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  )
}
