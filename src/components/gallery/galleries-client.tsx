'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Images, Lock, ChevronDown, ChevronUp, X, MoreVertical, Star, ExternalLink, ToggleRight, Archive, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface GalleriesClientProps {
  galleries: any[]
  previewsByGallery: Record<string, string[]>
}

// ── Utility ──────────────────────────────────────────────────────────────────
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function addMonths(d: Date, n: number) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }
function startOf(unit: 'week' | 'month', d: Date) {
  const r = new Date(d)
  if (unit === 'week') { r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0) }
  if (unit === 'month') { r.setDate(1); r.setHours(0,0,0,0) }
  return r
}
function endOf(unit: 'week' | 'month', d: Date) {
  const r = new Date(d)
  if (unit === 'week') { r.setDate(r.getDate() + (6 - r.getDay())); r.setHours(23,59,59,999) }
  if (unit === 'month') { r.setMonth(r.getMonth() + 1); r.setDate(0); r.setHours(23,59,59,999) }
  return r
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['S','M','T','W','T','F','S']

// ── Calendar Picker ──────────────────────────────────────────────────────────
interface DateRange { from: Date | null; to: Date | null }

function CalendarPicker({
  value,
  onChange,
  quickLabels,
}: {
  value: DateRange
  onChange: (r: DateRange) => void
  quickLabels: { label: string; from: () => Date; to: () => Date }[]
}) {
  const today = new Date(); today.setHours(0,0,0,0)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [hovered, setHovered] = useState<Date | null>(null)

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevDays = new Date(viewYear, viewMonth, 0).getDate()

  const inRange = (d: Date) => {
    const f = value.from, t = value.to ?? hovered
    if (!f) return false
    const lo = f < (t ?? f) ? f : (t ?? f)
    const hi = f < (t ?? f) ? (t ?? f) : f
    return d >= lo && d <= hi
  }
  const isFrom = (d: Date) => value.from && d.toDateString() === value.from.toDateString()
  const isTo   = (d: Date) => value.to   && d.toDateString() === value.to.toDateString()
  const isToday = (d: Date) => d.toDateString() === today.toDateString()

  const selectDay = (d: Date) => {
    if (!value.from || (value.from && value.to)) {
      onChange({ from: d, to: null })
    } else {
      const [lo, hi] = d < value.from ? [d, value.from] : [value.from, d]
      onChange({ from: lo, to: hi })
    }
  }

  const cells: { date: Date; current: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ date: new Date(viewYear, viewMonth - 1, prevDays - i), current: false })
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(viewYear, viewMonth, i), current: true })
  while (cells.length % 7 !== 0) cells.push({ date: new Date(viewYear, viewMonth + 1, cells.length - daysInMonth - firstDay + 1), current: false })

  return (
    <div className="flex flex-col sm:flex-row gap-0 sm:min-w-[520px]">
      {/* Calendar */}
      <div className="flex-1 p-4 min-w-[280px]">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1 hover:text-gray-900 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">{MONTHS[viewMonth]}</span>
            <span className="font-semibold text-gray-900">{viewYear}</span>
          </div>
          <button onClick={nextMonth} className="p-1 hover:text-gray-900 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0 mb-1">
          {DAYS.map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0">
          {cells.map(({ date, current }, idx) => {
            const from = isFrom(date), to = isTo(date), ranged = inRange(date), tod = isToday(date)
            return (
              <button
                key={idx}
                onClick={() => current && selectDay(date)}
                onMouseEnter={() => current && value.from && !value.to && setHovered(date)}
                onMouseLeave={() => setHovered(null)}
                className={`
                  relative text-sm h-9 w-full transition-colors
                  ${!current ? 'text-gray-300 cursor-default' : 'cursor-pointer'}
                  ${from || to ? 'text-white font-semibold z-10' : ''}
                  ${ranged && !from && !to && current ? 'bg-green-50 text-green-700' : ''}
                  ${!from && !to && !ranged && current ? 'hover:bg-gray-100 text-gray-800' : ''}
                  ${tod && !from && !to ? 'text-green-600 font-bold' : ''}
                `}
              >
                {(from || to) && (
                  <span className="absolute inset-1 rounded-full bg-green-600 z-[-1]" />
                )}
                {date.getDate()}
              </button>
            )
          })}
        </div>

        {(value.from || value.to) && (
          <button
            onClick={() => onChange({ from: null, to: null })}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 w-full text-center transition-colors"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Quick search */}
      <div className="hidden sm:block w-44 border-l border-gray-100 p-4 flex-shrink-0">
        <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3">Quick Search</p>
        <div className="space-y-0.5">
          {quickLabels.map(({ label, from, to }) => (
            <button
              key={label}
              onClick={() => onChange({ from: from(), to: to() })}
              className="w-full text-left text-sm font-medium text-gray-700 hover:text-green-600 py-1.5 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Simple list dropdown ─────────────────────────────────────────────────────
function ListDropdown({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <div className="py-2 min-w-[160px]">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors ${
            value === opt.value ? 'text-green-600' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Filter chip + dropdown shell ─────────────────────────────────────────────
function FilterChip({
  label,
  active,
  children,
}: {
  label: string
  active: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-sm font-medium border rounded-full px-4 py-1.5 transition-colors ${
          active
            ? 'border-green-500 text-green-700 bg-green-50'
            : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
        }`}
      >
        {label}
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden max-w-[calc(100vw-1rem)]">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Gallery card ──────────────────────────────────────────────────────────────
function GalleryCard({ gallery, previews }: { gallery: any; previews: string[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [starred, setStarred] = useState<boolean>(!!gallery.is_starred)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [menuOpen])

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() }

  const toggleStar = async (e: React.MouseEvent) => {
    stop(e)
    const next = !starred
    setStarred(next)
    await supabase.from('galleries').update({ is_starred: next }).eq('id', gallery.id)
  }

  const openMenu = (e: React.MouseEvent) => { stop(e); setMenuOpen(o => !o) }

  const previewClient = (e: React.MouseEvent) => {
    stop(e); setMenuOpen(false)
    window.open(`/g/${gallery.slug}`, '_blank')
  }

  const toggleSelection = async (e: React.MouseEvent) => {
    stop(e); setMenuOpen(false)
    const next = !gallery.allow_selection
    const updates: { allow_selection: boolean; gallery_type?: 'selection' | 'delivery' } = { allow_selection: next }
    if (!next) updates.gallery_type = 'delivery'   // disable → auto-switch to delivery
    const { error } = await supabase.from('galleries').update(updates).eq('id', gallery.id)
    if (error) toast.error('Failed to update')
    else { toast.success(next ? 'Selection mode on' : 'Switched to delivery gallery'); router.refresh() }
  }

  const archiveGallery = async (e: React.MouseEvent) => {
    stop(e); setMenuOpen(false)
    const { error } = await supabase.from('galleries').update({ status: 'archived' }).eq('id', gallery.id)
    if (error) toast.error('Failed to archive')
    else { toast.success('Gallery archived'); router.refresh() }
  }

  const deleteGallery = async (e: React.MouseEvent) => {
    stop(e); setMenuOpen(false)
    if (!confirm('Delete this gallery? This cannot be undone.')) return
    const { error } = await supabase.from('galleries').delete().eq('id', gallery.id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Gallery deleted'); router.refresh() }
  }

  const cover = gallery.cover_photo_url
  const hasPreview = !!cover || previews.length > 0

  return (
    <div className="group relative">
      {/* Cover image — clicking navigates */}
      <Link href={`/galleries/${gallery.id}`} className="block">
        <div className="relative aspect-square bg-gray-100 overflow-hidden rounded-md">
          {/* Photos */}
          {(() => {
            if (!hasPreview) return (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <Images className="w-10 h-10 text-gray-300" />
              </div>
            )
            if (cover) return <img src={cover} alt={gallery.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            if (previews.length === 1) return <img src={previews[0]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            if (previews.length === 2) return (
              <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                {previews.map((url: string, i: number) => <img key={i} src={url} alt="" className="w-full h-full object-cover" />)}
              </div>
            )
            if (previews.length === 3) return (
              <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                <img src={previews[0]} alt="" className="w-full h-full object-cover row-span-2" />
                <img src={previews[1]} alt="" className="w-full h-full object-cover" />
                <img src={previews[2]} alt="" className="w-full h-full object-cover" />
              </div>
            )
            return (
              <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                {previews.slice(0, 4).map((url: string, i: number) => <img key={i} src={url} alt="" className="w-full h-full object-cover" />)}
              </div>
            )
          })()}

          {/* Hover dim */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />

          {/* Existing badges */}
          {gallery.is_locked && (
            <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium">
              <Lock className="w-2 h-2" /> Locked
            </div>
          )}
          {gallery.status === 'draft' && (
            <div className="absolute top-1.5 left-1.5 bg-gray-900/70 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">
              Draft
            </div>
          )}

          {/* Three-dot menu button — top right */}
          <button
            onClick={openMenu}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-black/70"
          >
            <MoreVertical className="w-3 h-3" />
          </button>

          {/* Star button — bottom right */}
          <button
            onClick={toggleStar}
            className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-black/70"
          >
            <Star className={`w-3 h-3 transition-colors ${starred ? 'fill-amber-400 text-amber-400' : 'text-white'}`} />
          </button>
        </div>
      </Link>

      {/* Info */}
      <Link href={`/galleries/${gallery.id}`} className="flex items-center gap-1.5 mt-1.5 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${gallery.status === 'published' ? 'bg-green-500' : 'bg-gray-300'}`} />
        <p className="text-[11px] text-gray-500 flex-shrink-0">{gallery.total_photos ?? 0}</p>
        <p className="text-[11px] font-semibold text-gray-800 uppercase truncate flex-1">{gallery.title}</p>
        {gallery.gallery_type === 'selection' && (
          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-700 uppercase flex-shrink-0">Sel</span>
        )}
        <p className="text-[11px] text-gray-400 flex-shrink-0 hidden sm:block">{formatDate(gallery.created_at)}</p>
      </Link>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-12 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 min-w-[220px]"
        >
          <button onClick={previewClient}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
            Preview client gallery
          </button>
          <button onClick={toggleSelection}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <ToggleRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            {gallery.allow_selection ? 'Disable selection mode' : 'Switch to selection gallery'}
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button onClick={archiveGallery}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Archive className="w-5 h-5 text-gray-400 flex-shrink-0" />
            Archive gallery
          </button>
          <button onClick={deleteGallery}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-5 h-5 flex-shrink-0" />
            Delete gallery
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function GalleriesClient({ galleries, previewsByGallery }: GalleriesClientProps) {
  const today = new Date(); today.setHours(0,0,0,0)

  const [statusFilter, setStatusFilter]   = useState<string | null>(null)
  const [starredFilter, setStarredFilter] = useState<string | null>(null)
  const [eventDate,  setEventDate]  = useState<DateRange>({ from: null, to: null })
  const [expiryDate, setExpiryDate] = useState<DateRange>({ from: null, to: null })

  const eventQuick = [
    { label: 'Last week',    from: () => startOf('week', addDays(today, -7)),  to: () => endOf('week', addDays(today, -7)) },
    { label: 'Last 2 weeks', from: () => addDays(today, -14),                  to: () => addDays(today, -1) },
    { label: 'Last month',   from: () => startOf('month', addMonths(today,-1)),to: () => endOf('month', addMonths(today,-1)) },
    { label: 'Last 6 months',from: () => addMonths(today, -6),                 to: () => today },
    { label: 'Last year',    from: () => addMonths(today, -12),                to: () => today },
    { label: 'Next week',    from: () => startOf('week', addDays(today, 7)),   to: () => endOf('week', addDays(today, 7)) },
    { label: 'Next 2 weeks', from: () => addDays(today, 1),                    to: () => addDays(today, 14) },
    { label: 'Next month',   from: () => startOf('month', addMonths(today,1)), to: () => endOf('month', addMonths(today,1)) },
    { label: 'Next 6 months',from: () => today,                                to: () => addMonths(today, 6) },
    { label: 'Next year',    from: () => today,                                to: () => addMonths(today, 12) },
  ]
  const expiryQuick = eventQuick.filter(q => q.label.startsWith('Next'))

  // Apply filters
  const filtered = galleries.filter((g) => {
    if (statusFilter) {
      const s = statusFilter === 'hidden' ? 'archived' : statusFilter
      if (g.status !== s) return false
    }
    if (eventDate.from && eventDate.to && g.event_date) {
      const d = new Date(g.event_date)
      if (d < eventDate.from || d > eventDate.to) return false
    }
    if (expiryDate.from && expiryDate.to && g.expires_at) {
      const d = new Date(g.expires_at)
      if (d < expiryDate.from || d > expiryDate.to) return false
    }
    if (starredFilter === 'yes' && !g.is_starred) return false
    if (starredFilter === 'no'  &&  g.is_starred) return false
    return true
  })

  const anyActive = !!(statusFilter || starredFilter || eventDate.from || expiryDate.from)

  const clearAll = () => {
    setStatusFilter(null); setStarredFilter(null)
    setEventDate({ from: null, to: null }); setExpiryDate({ from: null, to: null })
  }

  const fmtDateRange = (r: DateRange) => {
    if (!r.from) return ''
    if (!r.to) return r.from.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    return `${r.from.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${r.to.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
  }

  return (
    <div className="min-h-full bg-white">

      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex-shrink-0">Collections</h1>

        {/* Filter chips — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Status */}
          <FilterChip label={statusFilter ? (statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)) : 'Status'} active={!!statusFilter}>
            <ListDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: 'Published', value: 'published' },
                { label: 'Hidden',    value: 'hidden'    },
                { label: 'Draft',     value: 'draft'     },
              ]}
            />
          </FilterChip>

          {/* Event Date */}
          <FilterChip
            label={eventDate.from ? `Event: ${fmtDateRange(eventDate)}` : 'Event Date'}
            active={!!eventDate.from}
          >
            <CalendarPicker value={eventDate} onChange={setEventDate} quickLabels={eventQuick} />
          </FilterChip>

          {/* Expiry Date */}
          <FilterChip
            label={expiryDate.from ? `Expiry: ${fmtDateRange(expiryDate)}` : 'Expiry Date'}
            active={!!expiryDate.from}
          >
            <CalendarPicker value={expiryDate} onChange={setExpiryDate} quickLabels={expiryQuick} />
          </FilterChip>

          {/* Starred */}
          <FilterChip label={starredFilter ? `Starred: ${starredFilter}` : 'Starred'} active={!!starredFilter}>
            <ListDropdown
              value={starredFilter}
              onChange={setStarredFilter}
              options={[
                { label: 'Yes', value: 'yes' },
                { label: 'No',  value: 'no'  },
              ]}
            />
          </FilterChip>

          {/* Clear all */}
          {anyActive && (
            <button onClick={clearAll} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        <Link
          href="/galleries/new"
          title="New Collection"
          className="inline-flex items-center justify-center w-9 h-9 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {/* ── GRID ── */}
      <div className="px-3 sm:px-6 py-4 sm:py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
              <Images className="w-8 h-8 text-green-400" />
            </div>
            {anyActive ? (
              <>
                <h2 className="text-lg font-semibold text-gray-900">No galleries match</h2>
                <p className="text-gray-500 text-sm mt-1">Try adjusting your filters.</p>
                <button onClick={clearAll} className="mt-3 text-sm text-green-600 hover:underline font-medium">Clear filters</button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900">No galleries yet</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-sm">Create your first gallery to start delivering photos to your clients.</p>
                <Link href="/galleries/new" className="mt-5 inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                  <Plus className="w-4 h-4" /> Create Your First Gallery
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-4">
            {filtered.map((gallery: any) => (
              <GalleryCard
                key={gallery.id}
                gallery={gallery}
                previews={previewsByGallery[gallery.id] ?? []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
