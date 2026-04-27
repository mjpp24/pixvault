'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Check, Monitor, Smartphone, RefreshCw, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { GalleryRow } from '@/types/database'
import { getLayoutContainerStyle, getItemStyle } from '@/lib/gallery-layout'

// ── Color themes ──────────────────────────────────────────────────────────────
export const COLOR_THEMES: {
  id: string
  name: string
  bg: string
  accent: string
  btn: string
  text: string
  heroText: string
}[] = [
  { id: 'light',            name: 'Light',            bg: '#ffffff', accent: '#7c2d2d', btn: '#3d3d3d', text: '#111111', heroText: '#111111' },
  { id: 'coastal-sunrise',  name: 'Coastal Sunrise',  bg: '#e0f4f4', accent: '#8c5e6e', btn: '#1a6b7c', text: '#1a1a2e', heroText: '#ffffff' },
  { id: 'beachside-escape', name: 'Beachside Escape',  bg: '#fdf6ec', accent: '#4a7c6f', btn: '#1a2f5a', text: '#1a1a1a', heroText: '#ffffff' },
  { id: 'lavender-dreams',  name: 'Lavender Dreams',  bg: '#f0eaff', accent: '#6b4db3', btn: '#3d2b8c', text: '#1a1a1a', heroText: '#ffffff' },
  { id: 'sunset-radiance',  name: 'Sunset Radiance',  bg: '#fffbe6', accent: '#7a6520', btn: '#c4440e', text: '#1a1a1a', heroText: '#ffffff' },
  { id: 'forest-haven',     name: 'Forest Haven',     bg: '#eef4e8', accent: '#2d6b2d', btn: '#4a4a2a', text: '#1a1a1a', heroText: '#ffffff' },
  { id: 'fresh-mint',       name: 'Fresh Mint',       bg: '#e8faf4', accent: '#6b4db3', btn: '#1a7a7a', text: '#1a1a1a', heroText: '#ffffff' },
  { id: 'modern-minimalist',name: 'Modern Minimalist', bg: '#f5f5f5', accent: '#7c2d2d', btn: '#4a5568', text: '#1a1a1a', heroText: '#ffffff' },
  { id: 'nautical-voyage',  name: 'Nautical Voyage',  bg: '#dce8f5', accent: '#2d7a7a', btn: '#0a1a4a', text: '#0a1a4a', heroText: '#ffffff' },
  { id: 'plum-romance',     name: 'Plum Romance',     bg: '#fce8f0', accent: '#7a1a5a', btn: '#e8186a', text: '#1a1a1a', heroText: '#ffffff' },
  { id: 'sweet-harmony',    name: 'Sweet Harmony',    bg: '#fff0e8', accent: '#6b5a1a', btn: '#e81a8a', text: '#1a1a1a', heroText: '#ffffff' },
  { id: 'classic-elegance', name: 'Classic Elegance', bg: '#faf6e8', accent: '#5a5a1a', btn: '#7a5a3a', text: '#1a1a1a', heroText: '#ffffff' },
  { id: 'tropical-paradise',name: 'Tropical Paradise', bg: '#e0f9f9', accent: '#4a4a4a', btn: '#1a5a2a', text: '#1a1a1a', heroText: '#ffffff' },
  { id: 'dark',             name: 'Dark',             bg: '#111111', accent: '#6b6b6b', btn: '#3a3a3a', text: '#ffffff', heroText: '#ffffff' },
]

// ── Cover styles ──────────────────────────────────────────────────────────────
export const COVER_STYLES = [
  { id: 'center',  name: 'Center'  },
  { id: 'left',    name: 'Left'    },
  { id: 'novel',   name: 'Novel'   },
  { id: 'vintage', name: 'Vintage' },
  { id: 'frame',   name: 'Frame'   },
  { id: 'stripe',  name: 'Stripe'  },
  { id: 'divider', name: 'Divider' },
  { id: 'journal', name: 'Journal' },
]

const FONTS = [
  { id: 'sans',    name: 'Sans',    sample: 'COVER TITLE', class: 'font-sans tracking-tight' },
  { id: 'serif',   name: 'Serif',   sample: 'Cover Title', class: 'font-serif tracking-wide' },
  { id: 'display', name: 'Display', sample: 'COVER TITLE', class: 'font-sans tracking-widest font-black' },
]

const SPACINGS = [
  { id: 'compact',   name: 'Compact',   gap: 0.5 },
  { id: 'standard',  name: 'Standard',  gap: 2 },
  { id: 'spacious',  name: 'Spacious',  gap: 4 },
]

const ROUNDNESS = [
  { id: 'flat',    name: 'Flat',    radius: 'rounded-none' },
  { id: 'rounded', name: 'Rounded', radius: 'rounded-lg' },
  { id: 'extra',   name: 'Extra',   radius: 'rounded-2xl' },
]

const GALLERY_LAYOUTS = [
  { id: 'classic-grid',  name: 'Classic Grid',   desc: '3-column equal squares' },
  { id: 'duo',           name: 'Duo',            desc: 'Clean 2-column grid' },
  { id: 'masonry',       name: 'Masonry',        desc: 'Pinterest-style flow' },
  { id: 'magazine',      name: 'Magazine',       desc: 'Hero + sidebar' },
  { id: 'spotlight',     name: 'Spotlight',      desc: 'Full-width hero rows' },
  { id: 'editorial',     name: 'Editorial',      desc: 'Large & small mix' },
  { id: 'mosaic',        name: 'Mosaic',         desc: 'Feature + surrounding' },
  { id: 'panoramic',     name: 'Panoramic',      desc: 'Full-width tall rows' },
  { id: 'film',          name: 'Film Strip',     desc: '4-column tight grid' },
  { id: 'gallery-wall',  name: 'Gallery Wall',   desc: 'Mixed premium sizes' },
]

function LayoutPreview({ id }: { id: string }) {
  const a = 'bg-gray-400'
  const b = 'bg-gray-300'

  if (id === 'classic-grid') return (
    <div className="grid grid-cols-3 gap-[2px] w-full h-full p-[2px]">
      {[...Array(9)].map((_, i) => <div key={i} className={i % 2 === 0 ? a : b} />)}
    </div>
  )
  if (id === 'duo') return (
    <div className="grid grid-cols-2 gap-[2px] w-full h-full p-[2px]">
      {[...Array(6)].map((_, i) => <div key={i} className={i % 2 === 0 ? a : b} />)}
    </div>
  )
  if (id === 'masonry') return (
    <div className="flex gap-[2px] w-full h-full p-[2px]">
      <div className="flex flex-col gap-[2px] flex-1">
        <div className={`${a}`} style={{ flex: 2 }} />
        <div className={`${b}`} style={{ flex: 1 }} />
      </div>
      <div className="flex flex-col gap-[2px] flex-1">
        <div className={`${b}`} style={{ flex: 1 }} />
        <div className={`${a}`} style={{ flex: 2 }} />
      </div>
      <div className="flex flex-col gap-[2px] flex-1">
        <div className={`${a}`} style={{ flex: 1.5 }} />
        <div className={`${b}`} style={{ flex: 1 }} />
        <div className={`${a}`} style={{ flex: 0.8 }} />
      </div>
    </div>
  )
  if (id === 'magazine') return (
    <div className="flex gap-[2px] w-full h-full p-[2px]">
      <div className={`${a} flex-[2]`} />
      <div className="flex flex-col gap-[2px] flex-1">
        <div className={`${b} flex-1`} />
        <div className={`${a} flex-1`} />
        <div className={`${b} flex-1`} />
      </div>
    </div>
  )
  if (id === 'spotlight') return (
    <div className="flex flex-col gap-[2px] w-full h-full p-[2px]">
      <div className={`${a} flex-[2]`} />
      <div className="flex gap-[2px] flex-1">
        <div className={`${b} flex-1`} />
        <div className={`${a} flex-1`} />
        <div className={`${b} flex-1`} />
      </div>
    </div>
  )
  if (id === 'editorial') return (
    <div className="flex flex-col gap-[2px] w-full h-full p-[2px]">
      <div className="flex gap-[2px]" style={{ flex: 2 }}>
        <div className={`${a} flex-[2]`} />
        <div className={`${b} flex-1`} />
      </div>
      <div className="flex gap-[2px] flex-1">
        <div className={`${b} flex-1`} />
        <div className={`${a} flex-1`} />
        <div className={`${b} flex-1`} />
      </div>
    </div>
  )
  if (id === 'mosaic') return (
    <div className="grid gap-[2px] w-full h-full p-[2px]" style={{ gridTemplateColumns: '1fr 2fr 1fr', gridTemplateRows: '1fr 2fr 1fr' }}>
      <div className={`${b}`} />
      <div className={`${b}`} />
      <div className={`${b}`} />
      <div className={`${b}`} />
      <div className={`${a}`} style={{ gridColumn: 2, gridRow: 2 }} />
      <div className={`${b}`} />
      <div className={`${b}`} />
      <div className={`${b}`} />
      <div className={`${b}`} />
    </div>
  )
  if (id === 'panoramic') return (
    <div className="flex flex-col gap-[2px] w-full h-full p-[2px]">
      <div className={`${a} flex-1`} />
      <div className={`${b} flex-1`} />
      <div className={`${a} flex-1`} />
    </div>
  )
  if (id === 'film') return (
    <div className="grid grid-cols-4 gap-[2px] w-full h-full p-[2px]">
      {[...Array(8)].map((_, i) => <div key={i} className={i % 2 === 0 ? a : b} />)}
    </div>
  )
  if (id === 'gallery-wall') return (
    <div className="grid gap-[2px] w-full h-full p-[2px]" style={{ gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
      <div className={`${a}`} style={{ gridRow: '1 / 3' }} />
      <div className={`${b}`} />
      <div className={`${a}`} />
      <div className={`${a}`} />
      <div className={`${b}`} />
      <div className={`${b}`} style={{ gridColumn: '1 / 4' }} />
    </div>
  )
  return null
}

// ── Mini CoverPreview ─────────────────────────────────────────────────────────
function CoverPreview({
  style,
  title,
  coverUrl,
  theme,
  font,
  small = false,
}: {
  style: string
  title: string
  coverUrl: string | null
  theme: typeof COLOR_THEMES[0]
  font: string
  small?: boolean
}) {
  const fontClass = FONTS.find(f => f.id === font)?.class ?? 'font-sans tracking-tight'
  const titleSize = small ? 'text-[8px]' : 'text-lg sm:text-2xl'
  const subSize   = small ? 'text-[5px]' : 'text-[10px]'
  const btnSize   = small ? 'text-[5px] px-1.5 py-0.5' : 'text-xs px-5 py-1.5'
  const bgImg     = coverUrl ? `url(${coverUrl})` : undefined

  const bgStyle = bgImg
    ? { backgroundImage: bgImg, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: '#888' }

  if (style === 'center') return (
    <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-end" style={bgStyle}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />
      <div className="relative z-10 text-center pb-4 px-2">
        <p className={`${fontClass} ${titleSize} font-bold text-white uppercase drop-shadow`}>{title}</p>
        <p className={`text-white/60 uppercase tracking-widest ${subSize} mt-0.5`}>JAN 1, 2027</p>
        <span className={`mt-2 border border-white text-white uppercase tracking-widest ${btnSize} ${fontClass} block mx-auto`}>
          View Gallery
        </span>
      </div>
    </div>
  )

  if (style === 'left') return (
    <div className="w-full h-full relative overflow-hidden flex items-end justify-start" style={bgStyle}>
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      <div className="relative z-10 text-left pb-4 pl-3 px-2">
        <p className={`${fontClass} ${titleSize} font-bold text-white uppercase drop-shadow`}>{title}</p>
        <p className={`text-white/60 uppercase tracking-widest ${subSize} mt-0.5`}>JAN 1, 2027</p>
        <span className={`mt-2 border border-white text-white uppercase tracking-widest ${btnSize} ${fontClass}`}>
          View Gallery
        </span>
      </div>
    </div>
  )

  if (style === 'novel') return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: theme.bg }}>
        <div className="text-center px-2">
          <p className={`${fontClass} ${small ? 'text-[8px]' : 'text-xl'} font-bold uppercase`} style={{ color: theme.text }}>{title}</p>
          <p className={`${subSize} tracking-widest uppercase mt-1`} style={{ color: theme.accent }}>JAN 1, 2027</p>
          <span className={`mt-2 uppercase tracking-widest ${btnSize} text-white`} style={{ backgroundColor: theme.btn }}>
            View
          </span>
        </div>
      </div>
      <div className="flex-1 h-full" style={bgStyle} />
    </div>
  )

  if (style === 'vintage') return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center" style={bgStyle}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
      <div className="relative z-10 text-center">
        <p className={`font-serif ${titleSize} font-bold text-white`} style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>{title}</p>
        <div className={`border-t border-b border-white/40 ${small ? 'py-0.5 my-0.5' : 'py-1 my-2'}`}>
          <p className={`text-white/70 tracking-widest uppercase ${subSize}`}>JAN 1, 2027</p>
        </div>
      </div>
    </div>
  )

  if (style === 'frame') return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center" style={bgStyle}>
      <div className="absolute inset-0 bg-black/40" />
      <div className={`relative z-10 border-2 border-white/70 ${small ? 'p-2 m-2' : 'p-6 m-4'} text-center`}>
        <p className={`${fontClass} ${titleSize} font-bold text-white uppercase`}>{title}</p>
        <p className={`text-white/60 uppercase tracking-widest ${subSize} mt-1`}>JAN 1, 2027</p>
      </div>
    </div>
  )

  if (style === 'stripe') return (
    <div className="w-full h-full relative overflow-hidden" style={bgStyle}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center px-3" style={{ backgroundColor: theme.btn + 'ee', paddingTop: small ? 4 : 12, paddingBottom: small ? 4 : 12 }}>
        <p className={`${fontClass} ${titleSize} font-bold text-white uppercase flex-1`}>{title}</p>
        <p className={`text-white/80 tracking-widest uppercase ${subSize}`}>JAN 2027</p>
      </div>
    </div>
  )

  if (style === 'divider') return (
    <div className="w-full h-full relative overflow-hidden flex flex-col" style={bgStyle}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="flex-1" />
      <div className="relative z-10 px-3 py-2 text-center border-t" style={{ borderColor: 'rgba(255,255,255,0.3)', backgroundColor: theme.btn + 'cc' }}>
        <p className={`${fontClass} ${small ? 'text-[8px]' : 'text-base'} font-bold text-white uppercase tracking-widest`}>{title}</p>
      </div>
    </div>
  )

  if (style === 'journal') return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="w-2/3 h-full" style={bgStyle} />
      <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: theme.bg }}>
        <p className={`font-serif ${small ? 'text-[7px]' : 'text-sm'} font-bold uppercase`} style={{ color: theme.text }}>{title}</p>
        <p className={`${subSize} tracking-widest mt-0.5`} style={{ color: theme.accent }}>JAN 2027</p>
      </div>
    </div>
  )

  return null
}

// ── Gallery layout preview grid (uses shared utility — matches real client view) ─
function GalleryPreviewGrid({
  layout, gap, roundClass, accent, coverUrl,
}: {
  layout: string
  gap: number
  roundClass: string
  accent: string
  coverUrl: string | null
}) {
  const count = layout === 'film' ? 8 : layout === 'duo' ? 6 : layout === 'panoramic' ? 3 : 9
  return (
    <div style={getLayoutContainerStyle(layout, gap)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`overflow-hidden ${roundClass}`}
          style={{ backgroundColor: accent + '25', ...getItemStyle(i, layout) }}
        >
          {coverUrl && <img src={coverUrl} alt="" className="w-full h-full object-cover" />}
        </div>
      ))}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{children}</h3>
  )
}

// ── Main design panel ─────────────────────────────────────────────────────────
interface GalleryDesignPanelProps {
  gallery: GalleryRow & { clients?: any }
  onUpdate: (updates: Partial<GalleryRow>) => void
}

export function GalleryDesignPanel({ gallery, onUpdate }: GalleryDesignPanelProps) {
  const [coverStyle,   setCoverStyle]   = useState(gallery.cover_style   ?? 'center')
  const [colorTheme,   setColorTheme]   = useState(gallery.color_theme   ?? 'light')
  const [fontStyle,    setFontStyle]    = useState(gallery.font_style    ?? 'sans')
  const [gridSpacing,  setGridSpacing]  = useState(gallery.grid_spacing  ?? 'standard')
  const [gridRoundness,setGridRoundness]= useState(gallery.grid_roundness ?? 'flat')
  const [galleryLayout, setGalleryLayout] = useState(gallery.gallery_layout ?? 'classic-grid')
  const [previewDevice,setPreviewDevice]= useState<'desktop'|'mobile'>('desktop')
  const [saving, setSaving] = useState(false)
  const [colorDropdownOpen,   setColorDropdownOpen]   = useState(false)
  const [spacingDropdownOpen, setSpacingDropdownOpen] = useState(false)
  const colorDropdownRef   = useRef<HTMLDivElement>(null)
  const spacingDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target as Node)) {
        setColorDropdownOpen(false)
      }
      if (spacingDropdownRef.current && !spacingDropdownRef.current.contains(e.target as Node)) {
        setSpacingDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const supabase = createClient()
  const theme = COLOR_THEMES.find(t => t.id === colorTheme) ?? COLOR_THEMES[0]

  const saveDesign = async () => {
    setSaving(true)
    const updates = { cover_style: coverStyle, color_theme: colorTheme, font_style: fontStyle, grid_spacing: gridSpacing, grid_roundness: gridRoundness, gallery_layout: galleryLayout }
    const { error } = await supabase.from('galleries').update(updates).eq('id', gallery.id)
    if (error) toast.error('Failed to save design')
    else { toast.success('Design saved!'); onUpdate(updates) }
    setSaving(false)
  }

  const roundClass = ROUNDNESS.find(r => r.id === gridRoundness)?.radius ?? 'rounded-none'
  const gapPx      = SPACINGS.find(s => s.id === gridSpacing)?.gap ?? 2

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── LEFT: Options panel ── */}
      <div className="w-64 flex-shrink-0 border-r border-gray-100 overflow-y-auto">
        <div className="p-4 space-y-6">

          {/* Cover layout */}
          <div>
            <SectionHeader>Cover</SectionHeader>
            <div className="grid grid-cols-2 gap-2">
              {COVER_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCoverStyle(s.id)}
                  className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                    coverStyle === s.id ? 'border-green-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ height: 80 }}
                >
                  <CoverPreview
                    style={s.id}
                    title="TITLE"
                    coverUrl={gallery.cover_photo_url}
                    theme={theme}
                    font={fontStyle}
                    small
                  />
                  {coverStyle === s.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <p className="absolute bottom-0 left-0 right-0 text-[9px] text-center font-medium py-0.5 bg-white/90">{s.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div>
            <SectionHeader>Typography</SectionHeader>
            <div className="space-y-2">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontStyle(f.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    fontStyle === f.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-gray-900 text-sm ${f.class}`}>{f.sample}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">JAN 1, 2027</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-1">{f.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Color themes */}
          <div>
            <SectionHeader>Color</SectionHeader>
            <div className="relative" ref={colorDropdownRef}>
              {/* Trigger */}
              <button
                onClick={() => setColorDropdownOpen(o => !o)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 hover:border-gray-300 bg-white transition-all"
              >
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: theme.bg }} />
                  <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: theme.accent }} />
                  <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: theme.btn }} />
                </div>
                <span className="text-sm font-medium text-gray-700 flex-1 text-left">{theme.name}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${colorDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown list */}
              {colorDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto max-h-64">
                  {COLOR_THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setColorTheme(t.id); setColorDropdownOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2 transition-all ${
                        colorTheme === t.id ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: t.bg }} />
                        <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: t.accent }} />
                        <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: t.btn }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 flex-1 text-left">{t.name}</span>
                      {colorTheme === t.id && <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Spacing */}
          <div>
            <SectionHeader>Spacing</SectionHeader>
            <div className="relative" ref={spacingDropdownRef}>
              <button
                onClick={() => setSpacingDropdownOpen(o => !o)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 hover:border-gray-300 bg-white transition-all"
              >
                <div className="grid grid-cols-2 w-7 h-7 flex-shrink-0" style={{ gap: (SPACINGS.find(s => s.id === gridSpacing)?.gap ?? 2) * 0.5 }}>
                  {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-400 rounded-sm" />)}
                </div>
                <span className="text-sm font-medium text-gray-700 flex-1 text-left">
                  {SPACINGS.find(s => s.id === gridSpacing)?.name ?? 'Standard'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${spacingDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {spacingDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {SPACINGS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setGridSpacing(s.id); setSpacingDropdownOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all ${
                        gridSpacing === s.id ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="grid grid-cols-2 w-7 h-7 flex-shrink-0" style={{ gap: s.gap * 0.5 }}>
                        {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-400 rounded-sm" />)}
                      </div>
                      <span className="text-sm font-medium text-gray-700 flex-1 text-left">{s.name}</span>
                      {gridSpacing === s.id && <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Roundness */}
          <div>
            <SectionHeader>Roundness</SectionHeader>
            <div className="grid grid-cols-3 gap-2">
              {ROUNDNESS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setGridRoundness(r.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                    gridRoundness === r.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-1 w-10 h-10">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`bg-gray-400 ${r.radius}`} />
                    ))}
                  </div>
                  <p className="text-[10px] font-medium text-gray-600">{r.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Gallery Layout */}
          <div>
            <SectionHeader>Gallery Layout</SectionHeader>
            <p className="text-[10px] text-gray-400 mb-2 -mt-2">Choose how your photos are arranged</p>
            <div className="grid grid-cols-2 gap-2">
              {GALLERY_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setGalleryLayout(l.id)}
                  className={`flex flex-col rounded-xl border-2 overflow-hidden transition-all ${
                    galleryLayout === l.id ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="relative w-full pointer-events-none" style={{ height: 64 }}>
                    <LayoutPreview id={l.id} />
                    {galleryLayout === l.id && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="px-1.5 py-1.5 bg-white pointer-events-none">
                    <p className="text-[10px] font-semibold text-gray-700 leading-tight">{l.name}</p>
                    <p className="text-[9px] text-gray-400 leading-tight mt-0.5">{l.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={saveDesign}
            disabled={saving}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Save Design'}
          </button>
        </div>
      </div>

      {/* ── RIGHT: Live Preview ── */}
      <div className="flex-1 bg-gray-100 overflow-auto flex flex-col">
        {/* Preview toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded transition-colors ${previewDevice === 'desktop' ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded transition-colors ${previewDevice === 'mobile' ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview frame */}
        <div className="flex-1 flex items-start justify-center p-6 overflow-auto">
          <div
            className={`bg-white shadow-2xl overflow-hidden transition-all duration-300 ${
              previewDevice === 'mobile' ? 'w-80 rounded-3xl' : 'w-full max-w-3xl rounded-xl'
            }`}
          >
            {/* Gallery hero */}
            <div className={`relative overflow-hidden ${previewDevice === 'mobile' ? 'h-72' : 'h-80'}`}>
              <CoverPreview
                style={coverStyle}
                title={gallery.title.toUpperCase()}
                coverUrl={gallery.cover_photo_url}
                theme={theme}
                font={fontStyle}
              />
            </div>

            {/* Sticky bar mock */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200" style={{ backgroundColor: theme.bg }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.text }}>{gallery.title}</p>
                <p className="text-[10px]" style={{ color: theme.accent }}>by Photographer</p>
              </div>
              <div className="flex gap-2">
                <button className="text-[10px] border px-2 py-1 rounded" style={{ color: theme.text, borderColor: theme.accent + '40' }}>Select</button>
                <button className="text-[10px] px-2 py-1 rounded text-white" style={{ backgroundColor: theme.btn }}>Share</button>
              </div>
            </div>

            {/* Photo grid preview */}
            <div className="p-3" style={{ backgroundColor: theme.bg }}>
              <GalleryPreviewGrid
                layout={galleryLayout}
                gap={gapPx * 4}
                roundClass={roundClass}
                accent={theme.accent}
                coverUrl={gallery.cover_photo_url}
              />
            </div>

            {/* Footer mock */}
            <div className="text-center py-3 text-[10px] tracking-widest uppercase" style={{ color: theme.accent + '80', backgroundColor: theme.bg }}>
              Powered by PixVault
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
