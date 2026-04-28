'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Eye, ChevronDown, Image as ImageIcon, Settings, BarChart2,
  Shield, Share2, Plus, Star, Trash2, Play, ImagePlus, Lock, Unlock,
  Copy, Check, ExternalLink, RefreshCw, CheckSquare, MessageSquare,
  MoreHorizontal, ArrowUpDown, LayoutGrid, MoreVertical, Pencil,
  ArrowUp, ArrowDown, Download, X, Move, Music, Volume2, VolumeX, Archive,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { GalleryRow, GalleryMedia } from '@/types/database'
import { GalleryLightbox } from './gallery-lightbox'
import { GalleryUploader } from './gallery-uploader'
import { GalleryDesignPanel } from './gallery-design-panel'
import { formatDate, RAW_EXTENSIONS } from '@/lib/utils'
import { extractRawThumbnail } from '@/lib/raw-thumbnail'
import { getLayoutContainerStyle, getItemStyle, getGapPx, getRoundClass } from '@/lib/gallery-layout'

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR']

type Tab = 'photos' | 'share' | 'settings' | 'analytics'
type SettingsOption = 'design' | 'downloads' | 'selections' | 'payments' | 'music'

interface Props {
  gallery: GalleryRow & { clients?: { name: string; email: string } | null }
  initialMedia: GalleryMedia[]
  photographerId: string
}

// ── Watermark overlay ─────────────────────────────────────────────────────────
function WatermarkThumb() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="absolute font-black text-white/30 text-[9px] tracking-widest uppercase whitespace-nowrap"
          style={{ top: `${(i % 3) * 35 - 5}%`, left: `${Math.floor(i / 3) * 40 - 10}%`, transform: 'rotate(-35deg)' }}>
          PREVIEW
        </span>
      ))}
    </div>
  )
}

// ── Status pill dropdown ──────────────────────────────────────────────────────
function StatusPill({ status, galleryId }: { status: string; galleryId: string }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(status)
  const supabase = createClient()
  const router = useRouter()

  const colors: Record<string, string> = {
    published: 'bg-green-100 text-green-700 border-green-200',
    draft:     'bg-gray-100  text-gray-600  border-gray-200',
    archived:  'bg-red-50    text-red-600   border-red-200',
  }

  const changeStatus = async (s: string) => {
    setOpen(false)
    const { error } = await supabase.from('galleries').update({ status: s as 'draft' | 'published' | 'archived' }).eq('id', galleryId)
    if (!error) { setCurrent(s); router.refresh(); toast.success(`Gallery ${s}`) }
    else toast.error('Failed to update status')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wide ${colors[current] ?? colors.draft}`}
      >
        {current}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden min-w-[130px]">
          {['published', 'draft', 'archived'].map(s => (
            <button key={s} onClick={() => changeStatus(s)}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors capitalize ${current === s ? 'text-green-600' : 'text-gray-700 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Selections panel ──────────────────────────────────────────────────────────
function SelectionsPanel({ gallery }: { gallery: GalleryRow & { clients?: { name: string; email: string } | null } }) {
  const supabase = createClient()
  const router = useRouter()
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  const [selections, setSelections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [locking, setLocking] = useState(false)

  useEffect(() => {
    supabase
      .from('selections')
      .select('*, gallery_media(id, file_name, thumbnail_url, file_url)')
      .eq('gallery_id', gallery.id)
      .order('selected_at', { ascending: false })
      .then(({ data }) => { setSelections(data ?? []); setLoading(false) })
  }, [gallery.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const mediaUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/gallery-media/${path}`

  const copyFilenames = async () => {
    const text = selections.map((s, i) => `${String(i + 1).padStart(2, '0')}. ${s.gallery_media?.file_name ?? ''}`).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true); toast.success('Filenames copied!'); setTimeout(() => setCopied(false), 2500)
  }

  const lockSelections = async () => {
    setLocking(true)
    const { error } = await supabase.from('galleries').update({ allow_selection: false }).eq('id', gallery.id)
    if (error) toast.error('Failed to lock')
    else { toast.success('Selections locked'); router.refresh() }
    setLocking(false)
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Client Selections</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? 'Loading…' : `${selections.length} photo${selections.length !== 1 ? 's' : ''} selected by client`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selections.length > 0 && (
              <button onClick={copyFilenames}
                className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Filenames
              </button>
            )}
            <Link href={`/galleries/${gallery.id}/selections`}
              className="flex items-center gap-1.5 text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
              View Selections
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-300">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : selections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-gray-200">
            <CheckSquare className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">No selections yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">Share the gallery link with your client so they can pick their favourites.</p>
          </div>
        ) : (
          <>
            {/* Photo grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mb-6">
              {selections.map((sel: any) => {
                const m = sel.gallery_media
                if (!m) return null
                const url = mediaUrl(m.thumbnail_url ?? m.file_url)
                return (
                  <div key={sel.id} className="relative group">
                    <a href={mediaUrl(m.file_url)} target="_blank" rel="noopener noreferrer">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200 hover:ring-green-400 transition-all">
                        <img src={url} alt={m.file_name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    </a>
                    <p className="text-[9px] text-gray-400 mt-0.5 truncate text-center">{m.file_name}</p>
                    {sel.comment && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow">
                        <MessageSquare className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Filename list */}
            <div className="border border-gray-100 rounded-xl overflow-hidden mb-5">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Filename list</p>
                <button onClick={copyFilenames}
                  className="text-[10px] text-green-600 font-semibold hover:underline flex items-center gap-1">
                  {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy all</>}
                </button>
              </div>
              <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                {selections.map((sel: any, idx: number) => (
                  <div key={sel.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="text-[10px] text-gray-300 font-mono w-5">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="text-xs text-gray-700 font-medium truncate flex-1">{sel.gallery_media?.file_name}</span>
                    {sel.comment && <MessageSquare className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link href={`/galleries/${gallery.id}/selections`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-green-200 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-50 transition-colors">
                <CheckSquare className="w-4 h-4" /> Full selections view
              </Link>
              <button onClick={lockSelections} disabled={locking}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-amber-200 text-amber-700 bg-amber-50 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50">
                {locking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Lock
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function GalleryDetailClient({ gallery: initialGallery, initialMedia, photographerId }: Props) {
  const [gallery, setGallery] = useState(initialGallery)
  const [media, setMedia] = useState<GalleryMedia[]>(initialMedia)
  const [tab, setTab] = useState<Tab>('photos')
  const [settingsOption, setSettingsOption] = useState<SettingsOption>('design')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [coverPath, setCoverPath] = useState(gallery.cover_photo_url ?? null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Protect settings
  const [lockAmount,   setLockAmount]   = useState(gallery.lock_amount?.toString() ?? '')
  const [lockCurrency, setLockCurrency] = useState(gallery.lock_currency ?? 'NGN')
  const [lockMessage,  setLockMessage]  = useState(gallery.lock_message ?? 'Please complete your payment to access your gallery.')
  const [previewBeforePayment, setPreviewBeforePayment] = useState(!gallery.is_locked)
  const [watermarkEnabled,     setWatermarkEnabled]     = useState(!gallery.allow_download)

  // Photo context menu
  const [photoMenu, setPhotoMenu] = useState<{ item: GalleryMedia; x: number; y: number } | null>(null)
  const [renamingItem, setRenamingItem] = useState<GalleryMedia | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [musicUrl, setMusicUrl] = useState<string | null>(gallery.background_music_url ?? null)
  const [musicUploading, setMusicUploading] = useState(false)
  const photoMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const replaceTargetRef = useRef<GalleryMedia | null>(null)
  const backfilledIds = useRef<Set<string>>(new Set())

  const supabase = createClient()
  const router = useRouter()

  const galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://pixvault-kohl.vercel.app'}/g/${gallery.slug}`

  const getPublicUrl = useCallback((path: string) => {
    const { data } = supabase.storage.from('gallery-media').getPublicUrl(path)
    return data.publicUrl
  }, [supabase])

  // Returns a fast-loading ~400px thumbnail URL for grid display.
  // Uses stored thumbnail_url if available, otherwise falls back to
  // Supabase's built-in image transform (works on free tier, no addon needed).
  const getThumbUrl = useCallback((path: string) => {
    const { data } = supabase.storage.from('gallery-media').getPublicUrl(path, {
      transform: { width: 400, quality: 70 },
    })
    return data.publicUrl
  }, [supabase])

  // Close photo menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) setPhotoMenu(null)
    }
    if (photoMenu) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [photoMenu])

  // Close More menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Backfill thumbnails for RAW files without one — runs whenever media changes (e.g. after a new upload)
  useEffect(() => {
    const rawNoThumb = media.filter((m) => {
      const ext = m.file_name.split('.').pop()?.toLowerCase() ?? ''
      return RAW_EXTENSIONS.has(ext) && !m.thumbnail_url && m.file_type === 'photo' && !backfilledIds.current.has(m.id)
    })
    if (rawNoThumb.length === 0) return

    let cancelled = false
    ;(async () => {
      for (const item of rawNoThumb) {
        backfilledIds.current.add(item.id)
        if (cancelled) break
        try {
          const { data: blob, error } = await supabase.storage.from('gallery-media').download(item.file_url)
          if (error || !blob) continue

          const thumbBlob = await extractRawThumbnail(blob, item.file_name)
          if (!thumbBlob || cancelled) continue

          // Store thumbnail in gallery-media next to the RAW file
          const thumbPath = item.file_url.replace(/\.[^.]+$/, '_thumb.jpg')
          const { error: upErr } = await supabase.storage
            .from('gallery-media')
            .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', upsert: true })
          if (upErr || cancelled) continue

          const { error: dbErr } = await supabase
            .from('gallery_media')
            .update({ thumbnail_url: thumbPath })
            .eq('id', item.id)
          if (dbErr || cancelled) continue

          setMedia((prev) =>
            prev.map((m) => m.id === item.id ? { ...m, thumbnail_url: thumbPath } : m)
          )
        } catch { /* ignore individual failures */ }
      }
    })()

    return () => { cancelled = true }
  }, [media]) // eslint-disable-line react-hooks/exhaustive-deps

  const openPhotoMenu = (e: React.MouseEvent, item: GalleryMedia) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.max(8, rect.right - 208)   // 208 = menu width
    const y = rect.bottom + 6
    setPhotoMenu({ item, x, y })
  }

  const handleRenameSubmit = async () => {
    if (!renamingItem || !renameValue.trim()) { setRenamingItem(null); return }
    const { error } = await supabase.from('gallery_media').update({ file_name: renameValue.trim() }).eq('id', renamingItem.id)
    if (error) toast.error('Failed to rename')
    else { toast.success('Renamed!'); setMedia(prev => prev.map(m => m.id === renamingItem.id ? { ...m, file_name: renameValue.trim() } : m)) }
    setRenamingItem(null)
  }

  const handleMoveTop = async (item: GalleryMedia) => {
    setPhotoMenu(null)
    const minOrder = Math.min(...media.map(m => m.display_order ?? 0))
    const { error } = await supabase.from('gallery_media').update({ display_order: minOrder - 1 }).eq('id', item.id)
    if (error) toast.error('Failed to move')
    else { toast.success('Moved to top'); refreshMedia() }
  }

  const handleMoveBottom = async (item: GalleryMedia) => {
    setPhotoMenu(null)
    const maxOrder = Math.max(...media.map(m => m.display_order ?? 0))
    const { error } = await supabase.from('gallery_media').update({ display_order: maxOrder + 1 }).eq('id', item.id)
    if (error) toast.error('Failed to move')
    else { toast.success('Moved to bottom'); refreshMedia() }
  }

  const handleDownloadPhoto = async (item: GalleryMedia) => {
    setPhotoMenu(null)
    try {
      const url = getPublicUrl(item.file_url)
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = item.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast.error('Download failed')
    }
  }

  const handleSharePhoto = (item: GalleryMedia) => {
    setPhotoMenu(null)
    navigator.clipboard.writeText(getPublicUrl(item.file_url))
    toast.success('Photo URL copied!')
  }

  const handleReplacePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const target = replaceTargetRef.current
    if (!file || !target) return
    e.target.value = ''
    const toastId = toast.loading('Uploading replacement…')
    const newPath = `${photographerId}/${gallery.id}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('gallery-media').upload(newPath, file, { cacheControl: '3600', upsert: false })
    if (upErr) { toast.error('Upload failed', { id: toastId }); return }
    const { error: dbErr } = await supabase.from('gallery_media').update({
      file_url: newPath, thumbnail_url: null,
      file_name: file.name, file_size: file.size, mime_type: file.type,
    }).eq('id', target.id)
    if (dbErr) { toast.error('Failed to update record', { id: toastId }); return }
    await supabase.storage.from('gallery-media').remove([target.file_url])
    toast.success('Photo replaced!', { id: toastId })
    refreshMedia()
  }

  // Called by GalleryUploader when new files land
  const refreshMedia = async () => {
    const { data } = await supabase
      .from('gallery_media').select('*')
      .eq('gallery_id', gallery.id)
      .order('display_order', { ascending: true })
    if (data) setMedia(data)
    const { data: g } = await supabase.from('galleries').select('*,clients(name,email)').eq('id', gallery.id).single()
    if (g) setGallery(g as any)

    // Auto-set cover photo if gallery has none and photos exist
    if (!g?.cover_photo_url && data && data.length > 0) {
      const firstPhoto = data.find((m) => m.file_type === 'photo')
      if (firstPhoto) {
        const { data: { publicUrl } } = supabase.storage.from('gallery-media').getPublicUrl(firstPhoto.file_url)
        const { error } = await supabase.from('galleries').update({ cover_photo_url: publicUrl }).eq('id', gallery.id)
        if (!error) setCoverPath(publicUrl)
      }
    }
  }

  const setCoverPhoto = async (item: GalleryMedia) => {
    const url = getPublicUrl(item.file_url)
    const { error } = await supabase.from('galleries').update({ cover_photo_url: url }).eq('id', gallery.id)
    if (!error) { setCoverPath(url); toast.success('Cover updated!'); router.refresh() }
    else toast.error('Failed to set cover')
  }

  const deleteMedia = async (id: string, filePath: string) => {
    if (!confirm('Delete this photo? This cannot be undone.')) return
    await supabase.storage.from('gallery-media').remove([filePath])
    const { error } = await supabase.from('gallery_media').delete().eq('id', id)
    if (!error) { setMedia(prev => prev.filter(m => m.id !== id)); toast.success('Deleted') }
    else toast.error('Failed to delete')
  }

  const saveProtect = async () => {
    setIsSaving(true)
    try {
      const updates: Partial<GalleryRow> = {
        allow_download: !watermarkEnabled,
        lock_amount:    lockAmount ? parseFloat(lockAmount) : null,
        lock_currency:  lockCurrency,
        lock_message:   lockMessage,
        is_locked:      !previewBeforePayment && !!lockAmount,
        status:         'published',
      }
      const { error } = await supabase.from('galleries').update(updates).eq('id', gallery.id)
      if (error) throw error
      setGallery(prev => ({ ...prev, ...updates }))
      toast.success('Settings saved!')
    } catch { toast.error('Failed to save') }
    finally { setIsSaving(false) }
  }

  const approvePayment = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase.from('galleries').update({ is_locked: false, allow_download: true }).eq('id', gallery.id)
      if (error) throw error
      setGallery(prev => ({ ...prev, is_locked: false, allow_download: true }))
      toast.success('Payment approved! Gallery unlocked.')
    } catch { toast.error('Failed to approve') }
    finally { setIsSaving(false) }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(galleryUrl)
    setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000)
  }

  const sortedMedia = [...media].sort((a, b) =>
    sortOrder === 'asc'
      ? a.file_name.localeCompare(b.file_name)
      : b.file_name.localeCompare(a.file_name)
  )

  const SIDEBAR_TABS = [
    { id: 'photos'    as Tab, Icon: ImageIcon,    label: 'Photos'   },
    { id: 'share'     as Tab, Icon: Shield,        label: 'Protect'  },
    { id: 'settings'  as Tab, Icon: Settings,      label: 'Settings' },
    { id: 'analytics' as Tab, Icon: BarChart2,     label: 'Analytics'},
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-2 px-3 sm:px-5 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <Link href="/galleries" className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 text-sm sm:text-base truncate uppercase tracking-wide">
            {gallery.title}
          </h1>
          <StatusPill status={gallery.status} galleryId={gallery.id} />
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 hidden sm:inline ${gallery.gallery_type === 'selection' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
            {gallery.gallery_type === 'selection' ? 'Selection' : 'Delivery'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* More dropdown */}
          <div ref={moreMenuRef} className="relative">
            <button
              onClick={() => setMoreMenuOpen(o => !o)}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">More</span>
              <ChevronDown className={`w-3 h-3 transition-transform hidden sm:block ${moreMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                <button
                  onClick={() => { setMoreMenuOpen(false); setTab('settings'); setSettingsOption('music') }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Music className="w-4 h-4 text-gray-400" /> Add Music
                </button>
                {gallery.status === 'published' && (
                  <a href={galleryUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors sm:hidden"
                  >
                    <Eye className="w-4 h-4 text-gray-400" /> Preview
                  </a>
                )}
                <button
                  onClick={async () => {
                    setMoreMenuOpen(false)
                    if (!confirm('Archive this gallery?')) return
                    await supabase.from('galleries').update({ status: 'archived' }).eq('id', gallery.id)
                    toast.success('Gallery archived'); router.push('/galleries')
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Archive className="w-4 h-4 text-gray-400" /> Archive Gallery
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={async () => {
                    setMoreMenuOpen(false)
                    if (!confirm('Delete this gallery? This cannot be undone.')) return
                    await supabase.from('galleries').delete().eq('id', gallery.id)
                    toast.success('Gallery deleted'); router.push('/galleries')
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete Gallery
                </button>
              </div>
            )}
          </div>
          {gallery.status === 'published' && (
            <a href={galleryUrl} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Eye className="w-3.5 h-3.5" /> Preview
            </a>
          )}
          <button
            onClick={() => { setTab('share'); copyLink() }}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-green-600 px-3 sm:px-4 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Share</span>
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT SIDEBAR (desktop only) ── */}
        <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-gray-100 bg-white flex-col overflow-hidden">
          {/* Cover photo */}
          <div className="relative group h-44 bg-gray-100 flex-shrink-0 overflow-hidden cursor-pointer"
            onClick={() => { /* could open file picker */ }}>
            {coverPath ? (
              <img src={coverPath} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-xs">No cover photo</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold flex items-center gap-1.5 transition-opacity">
                <ImagePlus className="w-4 h-4" /> Change Cover
              </span>
            </div>
          </div>

          {/* Tab icons */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            {SIDEBAR_TABS.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                title={label}
                className={`flex-1 flex items-center justify-center py-3 border-b-2 transition-colors ${
                  tab === id
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              </button>
            ))}
          </div>

          {/* Sidebar content per tab */}
          <div className="flex-1 overflow-y-auto">

            {/* PHOTOS tab sidebar */}
            {tab === 'photos' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Photos</p>
                  <button className="flex items-center gap-1 text-xs text-green-600 font-semibold hover:text-green-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Set
                  </button>
                </div>
                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2">
                    <MoreHorizontal className="w-3.5 h-3.5 text-gray-300" />
                    <span className="text-sm font-medium text-gray-800">
                      Highlights ({media.length})
                    </span>
                  </div>
                  <button className="text-gray-300 hover:text-gray-500 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Client info */}
                {(gallery as any).clients && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Client</p>
                    <p className="text-sm font-semibold text-gray-800">{(gallery as any).clients.name}</p>
                    <p className="text-xs text-gray-400">{(gallery as any).clients.email}</p>
                    <Link
                      href={`/galleries/${gallery.id}/selections`}
                      className="mt-2 flex items-center gap-1.5 text-xs text-green-600 hover:underline font-medium"
                    >
                      <CheckSquare className="w-3 h-3" /> View selections
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* SHARE / PROTECT tab sidebar */}
            {tab === 'share' && (
              <div className="p-4 space-y-4">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Protection</p>

                {/* Preview toggle */}
                <div
                  onClick={() => setPreviewBeforePayment(!previewBeforePayment)}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    previewBeforePayment ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    previewBeforePayment ? 'bg-green-600 border-green-600' : 'border-gray-300'
                  }`}>
                    {previewBeforePayment && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Allow preview before payment</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">Client can browse but not download</p>
                  </div>
                </div>

                {/* Watermark toggle */}
                <div
                  onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    watermarkEnabled ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    watermarkEnabled ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                  }`}>
                    {watermarkEnabled && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Watermark previews</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">PREVIEW stamp on every photo</p>
                  </div>
                </div>

                {/* Payment amount */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-700">Payment amount</p>
                  <div className="flex gap-2">
                    <input type="number" value={lockAmount} onChange={e => setLockAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="flex-1 h-9 rounded-lg border border-gray-200 bg-white text-gray-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <select value={lockCurrency} onChange={e => setLockCurrency(e.target.value)}
                      className="h-9 rounded-lg border border-gray-200 bg-white text-gray-900 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-700">Message to client</p>
                  <textarea value={lockMessage} onChange={e => setLockMessage(e.target.value)} rows={2}
                    className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>

                <button onClick={saveProtect} disabled={isSaving}
                  className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {isSaving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Save Settings'}
                </button>

                {/* Approve payment */}
                {(gallery.is_locked || !gallery.allow_download) && (
                  <button onClick={approvePayment} disabled={isSaving}
                    className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    <Unlock className="w-3.5 h-3.5" /> Approve & Unlock
                  </button>
                )}
              </div>
            )}

            {/* SETTINGS tab sidebar */}
            {tab === 'settings' && (
              <div className="p-4 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3">Options</p>
                {([
                  { id: 'design'     as SettingsOption, label: 'Design',     icon: ImageIcon },
                  { id: 'downloads'  as SettingsOption, label: 'Downloads',  icon: ArrowUpDown },
                  { id: 'selections' as SettingsOption, label: 'Selections', icon: CheckSquare },
                  { id: 'payments'   as SettingsOption, label: 'Payments',   icon: Shield },
                  { id: 'music'      as SettingsOption, label: 'Music',      icon: Music },
                ]).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setSettingsOption(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      settingsOption === id
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon
                      className={`flex-shrink-0 ${settingsOption === id ? 'text-green-500' : 'text-gray-400'}`}
                      style={{ width: 16, height: 16 }}
                    />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* ANALYTICS tab sidebar */}
            {tab === 'analytics' && (
              <div className="p-4 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3">Analytics</p>
                {[
                  { label: 'Downloads', value: 0 },
                  { label: 'Selections', value: 0 },
                  { label: 'Payments', value: 0 },
                  { label: 'Views', value: gallery.views ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 text-sm">
                    <span className="text-gray-600 font-medium">{label}</span>
                    <span className="font-bold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
            <a href={galleryUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center text-xs border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> View
            </a>
            <button onClick={copyLink}
              className="flex-1 text-xs bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-1.5">
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className={`flex-1 min-w-0 bg-white pb-16 md:pb-0 ${tab === 'settings' && settingsOption === 'design' ? 'flex overflow-hidden' : 'overflow-y-auto'}`}>

          {/* PHOTOS main content */}
          {tab === 'photos' && (
            <div>
              {/* Section header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h2 className="font-semibold text-gray-800 text-base">Highlights</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-medium border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    Name: {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                  </button>
                  <button className="p-1.5 text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Uploader (collapsed inline) */}
              <div className="px-6 pt-4 pb-2">
                <GalleryUploader galleryId={gallery.id} photographerId={photographerId} galleryType={gallery.gallery_type} onUploadComplete={refreshMedia} />
              </div>

              {/* Photo grid — compact admin view: small tiles, no horizontal scroll */}
              {sortedMedia.length > 0 && (
                <div className="px-3 pb-6">
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '6px',
                  }}>
                    {sortedMedia.map((item, index) => {
                      const url = getPublicUrl(item.file_url)
                      // Use stored thumbnail → Supabase transform (400px) → full URL
                      const thumb = item.thumbnail_url
                        ? getPublicUrl(item.thumbnail_url)
                        : getThumbUrl(item.file_url)
                      const isCover = getPublicUrl(item.file_url) === coverPath
                      const roundClass = getRoundClass(gallery.grid_roundness)

                      const ext = item.file_name.split('.').pop()?.toLowerCase() ?? ''
                      const isRawFile = RAW_EXTENSIONS.has(ext)
                      const hasThumb = !!item.thumbnail_url

                      return (
                        <div key={item.id} className="group" style={{ aspectRatio: '3/4' }}>
                          <div className={`relative bg-gray-800 overflow-hidden ${roundClass}`} style={{ height: '100%', width: '100%' }}>
                            {item.file_type === 'photo' ? (
                              isRawFile && !hasThumb ? (
                                // RAW file — thumbnail being generated in background
                                <div
                                  className="w-full h-full flex flex-col items-center justify-center bg-gray-100 cursor-pointer gap-2 animate-pulse"
                                  onClick={() => setLightboxIndex(index)}
                                >
                                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 9.75h.008v.008H3V9.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                  </svg>
                                  <span className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">
                                    {ext.toUpperCase()}
                                  </span>
                                </div>
                              ) : (
                                <img src={thumb} alt={item.file_name}
                                  className="w-full h-full object-contain cursor-pointer group-hover:opacity-90 transition-all"
                                  onClick={() => setLightboxIndex(index)}
                                  loading="lazy"
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-900 cursor-pointer"
                                onClick={() => setLightboxIndex(index)}>
                                {thumb !== url && <img src={thumb} alt="" className="w-full h-full object-cover absolute inset-0 opacity-60" />}
                                <Play className="w-8 h-8 text-white relative z-10" />
                              </div>
                            )}


                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all pointer-events-none" />

                            {/* Drag handle — top left */}
                            <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <div className="p-1 rounded bg-black/50 backdrop-blur-sm text-white">
                                <Move className="w-3 h-3" />
                              </div>
                            </div>

                            {/* 3-dot menu button — top right */}
                            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => openPhotoMenu(e, item)}
                                className={`p-1 rounded border backdrop-blur-sm transition-colors ${
                                  photoMenu?.item.id === item.id
                                    ? 'bg-white border-green-400 text-green-600'
                                    : 'bg-black/50 border-transparent text-white hover:bg-white hover:text-gray-800'
                                }`}
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Download icon — bottom right on hover */}
                            <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadPhoto(item) }}
                                className="p-1 rounded bg-black/50 backdrop-blur-sm text-white hover:bg-white hover:text-gray-800 transition-colors"
                                title="Download"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Cover badge */}
                            {isCover && (
                              <div className="absolute bottom-1.5 left-1.5 pointer-events-none">
                                <span className="text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded">Cover</span>
                              </div>
                            )}
                          </div>
                          {/* Filename below — like reference */}
                          <p className="text-[10px] text-gray-400 mt-1 truncate text-center leading-tight px-0.5">
                            {item.file_name}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SHARE main content */}
          {tab === 'share' && (
            <div className="p-6 max-w-lg space-y-5">
              <h2 className="font-bold text-gray-900 text-lg">Share Gallery</h2>

              {/* Status banner */}
              <div className={`rounded-xl p-4 flex items-start gap-3 ${gallery.is_locked ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${gallery.is_locked ? 'bg-amber-100' : 'bg-green-100'}`}>
                  {gallery.is_locked ? <Lock className="w-4 h-4 text-amber-600" /> : <Check className="w-4 h-4 text-green-600" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${gallery.is_locked ? 'text-amber-800' : 'text-green-800'}`}>
                    {gallery.is_locked ? 'Gallery locked — awaiting payment' : 'Gallery ready'}
                  </p>
                  <p className={`text-xs mt-0.5 ${gallery.is_locked ? 'text-amber-600' : 'text-green-600'}`}>
                    {gallery.is_locked
                      ? `Client must pay ${gallery.lock_currency} ${gallery.lock_amount?.toLocaleString()}`
                      : gallery.allow_download ? 'Client can view and download' : 'Preview only — watermark active'}
                  </p>
                </div>
              </div>

              {/* Share link */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Client gallery link</p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="flex-1 text-sm text-gray-700 truncate font-mono text-xs">{galleryUrl}</span>
                  <button onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors flex-shrink-0">
                    {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                  <a href={galleryUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-green-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* WhatsApp */}
              <a href={`https://wa.me/?text=Your gallery is ready! ${encodeURIComponent(galleryUrl)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Send via WhatsApp
              </a>

              <Link href={`/galleries/${gallery.id}/selections`}
                className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                <CheckSquare className="w-4 h-4" /> View Client Selections
              </Link>
            </div>
          )}

          {/* SETTINGS main content */}
          {tab === 'settings' && settingsOption === 'design' && (
            <GalleryDesignPanel
              gallery={gallery}
              onUpdate={(updates) => setGallery(prev => ({ ...prev, ...updates }))}
            />
          )}

          {tab === 'settings' && settingsOption === 'selections' && (
            <SelectionsPanel gallery={gallery} />
          )}

          {tab === 'settings' && settingsOption === 'music' && (
            <div className="p-8 max-w-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Music className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Background Music</h2>
                  <p className="text-sm text-gray-400">Music plays automatically when clients open the gallery</p>
                </div>
              </div>

              {musicUrl ? (
                <div className="border border-gray-200 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Volume2 className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate flex-1">Music track added</p>
                    <button
                      onClick={async () => {
                        await supabase.from('galleries').update({ background_music_url: null }).eq('id', gallery.id)
                        setMusicUrl(null)
                        toast.success('Music removed')
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <audio controls src={musicUrl} className="w-full h-9" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-200 rounded-2xl p-10 cursor-pointer hover:border-purple-300 hover:bg-purple-50/50 transition-all group mb-4">
                  <Music className="w-8 h-8 text-gray-300 group-hover:text-purple-400 mb-3 transition-colors" />
                  <p className="text-sm font-semibold text-gray-600 group-hover:text-purple-600">
                    {musicUploading ? 'Uploading…' : 'Click to upload music'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">MP3, AAC, WAV, OGG · Max 20 MB</p>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    disabled={musicUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 20 * 1024 * 1024) { toast.error('File exceeds 20 MB'); return }
                      setMusicUploading(true)
                      try {
                        const ext = file.name.split('.').pop() ?? 'mp3'
                        const path = `${photographerId}/${gallery.id}/music/bg.${ext}`
                        const { error: upErr } = await supabase.storage.from('gallery-media').upload(path, file, { upsert: true })
                        if (upErr) throw upErr
                        const { data: { publicUrl } } = supabase.storage.from('gallery-media').getPublicUrl(path)
                        await supabase.from('galleries').update({ background_music_url: publicUrl }).eq('id', gallery.id)
                        setMusicUrl(publicUrl)
                        toast.success('Music added!')
                      } catch {
                        toast.error('Failed to upload music')
                      } finally {
                        setMusicUploading(false)
                      }
                    }}
                  />
                </label>
              )}

              <p className="text-xs text-gray-400 leading-relaxed">
                The music will auto-play (muted by default, client can unmute) when they open the gallery. Choose ambient music that matches the mood of your shoot.
              </p>
            </div>
          )}

          {tab === 'settings' && settingsOption !== 'design' && settingsOption !== 'selections' && settingsOption !== 'music' && (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
              <Settings className="w-8 h-8 opacity-30" />
              <p className="text-sm capitalize">{settingsOption} settings coming soon</p>
            </div>
          )}

          {/* ANALYTICS main content */}
          {tab === 'analytics' && (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
              <BarChart2 className="w-8 h-8 opacity-30" />
              <p className="text-sm">Analytics coming soon</p>
            </div>
          )}
        </main>

        {/* ── MOBILE BOTTOM DRAWER ── */}
        {mobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileDrawerOpen(false)} />
            {/* Sheet */}
            <div className="relative bg-white rounded-t-2xl max-h-[75vh] flex flex-col overflow-hidden shadow-2xl">
              {/* Handle */}
              <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              {/* Tab icons row */}
              <div className="flex border-b border-gray-100 flex-shrink-0 px-4">
                {SIDEBAR_TABS.map(({ id, Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 border-b-2 transition-colors ${
                      tab === id ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400'
                    }`}
                  >
                    <Icon style={{ width: 18, height: 18 }} />
                    <span className="text-[10px] font-medium">{label}</span>
                  </button>
                ))}
              </div>
              {/* Sidebar content (scrollable) */}
              <div className="flex-1 overflow-y-auto">
                {/* PHOTOS tab */}
                {tab === 'photos' && (
                  <div className="p-4">
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3">Photos</p>
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 border border-gray-200 mb-3">
                      <span className="text-sm font-medium text-gray-800">Highlights ({media.length})</span>
                    </div>
                    {(gallery as any).clients && (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Client</p>
                        <p className="text-sm font-semibold text-gray-800">{(gallery as any).clients.name}</p>
                        <p className="text-xs text-gray-400">{(gallery as any).clients.email}</p>
                        <Link href={`/galleries/${gallery.id}/selections`} className="mt-2 flex items-center gap-1.5 text-xs text-green-600 hover:underline font-medium">
                          <CheckSquare className="w-3 h-3" /> View selections
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                {/* SHARE tab */}
                {tab === 'share' && (
                  <div className="p-4 space-y-4">
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Protection</p>
                    <div onClick={() => setPreviewBeforePayment(!previewBeforePayment)}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${previewBeforePayment ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${previewBeforePayment ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                        {previewBeforePayment && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Allow preview before payment</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Client can browse but not download</p>
                      </div>
                    </div>
                    <div onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${watermarkEnabled ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${watermarkEnabled ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                        {watermarkEnabled && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Watermark previews</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">PREVIEW stamp on every photo</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-700">Payment amount</p>
                      <div className="flex gap-2">
                        <input type="number" value={lockAmount} onChange={e => setLockAmount(e.target.value)} placeholder="e.g. 50000"
                          className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        <select value={lockCurrency} onChange={e => setLockCurrency(e.target.value)}
                          className="h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none">
                          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-700">Message to client</p>
                      <textarea value={lockMessage} onChange={e => setLockMessage(e.target.value)} rows={2}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                    </div>
                    <button onClick={saveProtect} disabled={isSaving}
                      className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2">
                      {isSaving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Save Settings'}
                    </button>
                    {(gallery.is_locked || !gallery.allow_download) && (
                      <button onClick={approvePayment} disabled={isSaving}
                        className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        <Unlock className="w-3.5 h-3.5" /> Approve & Unlock
                      </button>
                    )}
                  </div>
                )}
                {/* SETTINGS tab */}
                {tab === 'settings' && (
                  <div className="p-4 space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3">Options</p>
                    {([
                      { id: 'design' as SettingsOption, label: 'Design', icon: ImageIcon },
                      { id: 'downloads' as SettingsOption, label: 'Downloads', icon: ArrowUpDown },
                      { id: 'selections' as SettingsOption, label: 'Selections', icon: CheckSquare },
                      { id: 'payments' as SettingsOption, label: 'Payments', icon: Shield },
                      { id: 'music' as SettingsOption, label: 'Music', icon: Music },
                    ]).map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => { setSettingsOption(id); setMobileDrawerOpen(false) }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${settingsOption === id ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Icon className={`flex-shrink-0 ${settingsOption === id ? 'text-green-500' : 'text-gray-400'}`} style={{ width: 16, height: 16 }} />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {/* ANALYTICS tab */}
                {tab === 'analytics' && (
                  <div className="p-4 space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3">Analytics</p>
                    {[{ label: 'Downloads', value: 0 }, { label: 'Selections', value: 0 }, { label: 'Payments', value: 0 }, { label: 'Views', value: gallery.views ?? 0 }]
                      .map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 text-sm">
                          <span className="text-gray-600 font-medium">{label}</span>
                          <span className="font-bold text-gray-900">{value}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              {/* Bottom actions */}
              <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
                <a href={galleryUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center text-xs border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> View
                </a>
                <button onClick={copyLink}
                  className="flex-1 text-xs bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-1.5">
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MOBILE BOTTOM TAB BAR ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex">
          {SIDEBAR_TABS.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                if (tab === id && mobileDrawerOpen) {
                  setMobileDrawerOpen(false)
                } else {
                  setTab(id)
                  setMobileDrawerOpen(true)
                }
              }}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
                tab === id && mobileDrawerOpen ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <Icon style={{ width: 20, height: 20 }} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </nav>

      </div>

      {/* Hidden file input for Replace photo */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleReplacePhoto}
      />

      {/* ── PHOTO CONTEXT MENU (fixed position, outside overflow-hidden) ── */}
      {photoMenu && (
        <div
          ref={photoMenuRef}
          style={{ position: 'fixed', left: photoMenu.x, top: photoMenu.y, zIndex: 9999 }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 w-52"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            {
              label: 'Remove photo', Icon: X, danger: true,
              action: () => { const i = photoMenu.item; setPhotoMenu(null); deleteMedia(i.id, i.file_url) },
            },
            {
              label: 'Rename photo', Icon: Pencil,
              action: () => { setRenamingItem(photoMenu.item); setRenameValue(photoMenu.item.file_name); setPhotoMenu(null) },
            },
            {
              label: 'Replace photo', Icon: RefreshCw,
              action: () => { replaceTargetRef.current = photoMenu.item; setPhotoMenu(null); replaceInputRef.current?.click() },
            },
            {
              label: 'Open photo', Icon: ExternalLink,
              action: () => { window.open(getPublicUrl(photoMenu.item.file_url), '_blank'); setPhotoMenu(null) },
            },
            { separator: true },
            { label: 'Move to top',    Icon: ArrowUp,   action: () => handleMoveTop(photoMenu.item) },
            { label: 'Move to bottom', Icon: ArrowDown, action: () => handleMoveBottom(photoMenu.item) },
            { separator: true },
            {
              label: 'Make cover photo', Icon: ImagePlus,
              active: getPublicUrl(photoMenu.item.file_url) === coverPath,
              action: () => { setCoverPhoto(photoMenu.item); setPhotoMenu(null) },
            },
            {
              label: 'Share photo', Icon: Share2,
              action: () => handleSharePhoto(photoMenu.item),
            },
            {
              label: 'Download photo', Icon: Download,
              action: () => handleDownloadPhoto(photoMenu.item),
            },
          ].map((row, i) => {
            if ((row as any).separator) return <div key={i} className="my-1 border-t border-gray-100" />
            const MenuIcon = row.Icon!
            return (
              <button
                key={row.label}
                onClick={row.action}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                  (row as any).danger
                    ? 'text-red-500 hover:bg-red-50'
                    : (row as any).active
                    ? 'text-green-600 bg-green-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MenuIcon className="w-4 h-4 flex-shrink-0" />
                {row.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── RENAME DIALOG ── */}
      {renamingItem && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-6" onClick={() => setRenamingItem(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Rename photo</h3>
            <p className="text-xs text-gray-400 mb-3 truncate">{renamingItem.file_name}</p>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenamingItem(null) }}
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setRenamingItem(null)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleRenameSubmit}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          media={sortedMedia}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          getUrl={getPublicUrl}
          watermark={!gallery.allow_download}
        />
      )}
    </div>
  )
}
