'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Download, Lock, MoreHorizontal, ExternalLink, Trash2, RefreshCw, Mail } from 'lucide-react'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/client'

interface SelectionItem {
  id: string
  file_name: string
  file_url: string        // full public URL
  thumbnail_url: string   // full public URL
  comment: string | null
  client_email: string
  client_name: string | null
}

interface Props {
  galleryId: string
  gallerySlug: string
  selections: SelectionItem[]
  totalSelections: number
}

export function SelectionsActionBar({ galleryId, gallerySlug, selections, totalSelections }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [copied, setCopied] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [locking, setLocking] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  // Close "More" dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    if (moreOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [moreOpen])

  // ── Copy Filenames ──────────────────────────────────────────────────────────
  const copyFilenames = async () => {
    if (selections.length === 0) { toast.error('No selections to copy'); return }
    const text = selections.map((s, i) => `${String(i + 1).padStart(2, '0')}. ${s.file_name}`).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`Copied ${selections.length} filename${selections.length !== 1 ? 's' : ''} to clipboard`)
    setTimeout(() => setCopied(false), 2500)
  }

  // ── Download All as ZIP ─────────────────────────────────────────────────────
  const downloadZip = async () => {
    if (selections.length === 0) { toast.error('No selections to download'); return }
    setZipping(true)
    const toastId = toast.loading(`Building zip (0 / ${selections.length})…`)
    try {
      const zip = new JSZip()
      let done = 0

      await Promise.all(
        selections.map(async (sel) => {
          const res = await fetch(sel.file_url)
          if (!res.ok) throw new Error(`Failed to fetch ${sel.file_name}`)
          const blob = await res.blob()
          zip.file(sel.file_name, blob)
          done++
          toast.loading(`Building zip (${done} / ${selections.length})…`, { id: toastId })
        })
      )

      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `selections-${gallerySlug}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded ${selections.length} file${selections.length !== 1 ? 's' : ''}`, { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Failed to build zip. Try again.', { id: toastId })
    } finally {
      setZipping(false)
    }
  }

  // ── Lock Selections ─────────────────────────────────────────────────────────
  const lockSelections = async () => {
    setMoreOpen(false)
    setLocking(true)
    try {
      const { error } = await supabase
        .from('galleries')
        .update({ allow_selection: false })
        .eq('id', galleryId)
      if (error) throw error
      toast.success('Selections locked — client can no longer change them')
      router.refresh()
    } catch {
      toast.error('Failed to lock selections')
    } finally {
      setLocking(false)
    }
  }

  // ── Clear all selections ─────────────────────────────────────────────────────
  const clearSelections = async () => {
    setMoreOpen(false)
    if (!confirm('Clear ALL selections? This cannot be undone.')) return
    try {
      const { error } = await supabase.from('selections').delete().eq('gallery_id', galleryId)
      if (error) throw error
      toast.success('All selections cleared')
      router.refresh()
    } catch {
      toast.error('Failed to clear selections')
    }
  }

  // ── Email filenames ─────────────────────────────────────────────────────────
  const emailFilenames = () => {
    setMoreOpen(false)
    const list = selections.map((s, i) => `${i + 1}. ${s.file_name}`).join('%0A')
    const subject = `Selected photos — ${gallerySlug}`
    const body = `Here are the selected filenames:%0A%0A${list}`
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  return (
    <div className="flex items-center gap-2">
      {/* View client gallery */}
      <a
        href={`/g/${gallerySlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-medium"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View Gallery
      </a>

      {/* Copy Filenames */}
      <button
        onClick={copyFilenames}
        disabled={totalSelections === 0}
        className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied!' : 'Copy Filenames'}
      </button>

      {/* Download Zip */}
      <button
        onClick={downloadZip}
        disabled={totalSelections === 0 || zipping}
        className="flex items-center gap-1.5 text-xs font-semibold border border-green-200 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {zipping
          ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Zipping…</>
          : <><Download className="w-3.5 h-3.5" /> Download All</>
        }
      </button>

      {/* Lock Selections */}
      <button
        onClick={lockSelections}
        disabled={locking || totalSelections === 0}
        className="flex items-center gap-1.5 text-xs font-semibold border border-amber-200 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {locking
          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          : <Lock className="w-3.5 h-3.5" />
        }
        <span className="hidden sm:inline">Lock Selections</span>
      </button>

      {/* More ⋯ */}
      <div ref={moreRef} className="relative">
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={`flex items-center gap-1 text-xs font-semibold border px-3 py-1.5 rounded-lg transition-colors ${
            moreOpen ? 'border-gray-300 bg-gray-100 text-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          More <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        {moreOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5">
            <button
              onClick={copyFilenames}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-4 h-4 text-gray-400" />
              Copy Filenames
            </button>
            <button
              onClick={emailFilenames}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-4 h-4 text-gray-400" />
              Email Filenames
            </button>
            <button
              onClick={downloadZip}
              disabled={zipping}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <Download className="w-4 h-4 text-gray-400" />
              Download as ZIP
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={lockSelections}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <Lock className="w-4 h-4" />
              Lock Selections
            </button>
            <button
              onClick={clearSelections}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Selections
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
