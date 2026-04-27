'use client'

import { useState } from 'react'
import { Copy, Check, Lock, Unlock, Mail, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { GalleryRow } from '@/types/database'
import { Button } from '@/components/ui/button'

interface GallerySharePanelProps {
  gallery: GalleryRow
}

export function GallerySharePanel({ gallery }: GallerySharePanelProps) {
  const supabase = createClient()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL}/g/${gallery.slug}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(galleryUrl)
    setCopied(true)
    toast.success('Gallery link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleLock = async () => {
    setIsLocking(true)
    const { error } = await supabase
      .from('galleries')
      .update({ is_locked: !gallery.is_locked })
      .eq('id', gallery.id)

    if (!error) {
      toast.success(gallery.is_locked ? 'Gallery unlocked' : 'Gallery locked')
      router.refresh()
    } else {
      toast.error('Failed to update gallery lock')
    }
    setIsLocking(false)
  }

  const togglePublish = async () => {
    setIsPublishing(true)
    const newStatus = gallery.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase
      .from('galleries')
      .update({ status: newStatus })
      .eq('id', gallery.id)

    if (!error) {
      toast.success(newStatus === 'published' ? 'Gallery published!' : 'Gallery unpublished')
      router.refresh()
    } else {
      toast.error('Failed to update status')
    }
    setIsPublishing(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900 text-sm">Share Gallery</h3>

      {/* Gallery link */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-w-0">
          <span className="text-xs text-gray-500 truncate flex-1">{galleryUrl}</span>
          <button onClick={copyLink} className="flex-shrink-0 text-gray-400 hover:text-green-600 transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <a
          href={galleryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-200 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Publish / Unpublish */}
      <Button
        variant={gallery.status === 'published' ? 'outline' : 'default'}
        className="w-full"
        loading={isPublishing}
        onClick={togglePublish}
      >
        {gallery.status === 'published' ? 'Unpublish Gallery' : 'Publish Gallery'}
      </Button>

      {/* Lock / Unlock */}
      <button
        onClick={toggleLock}
        disabled={isLocking}
        className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
          gallery.is_locked
            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        {gallery.is_locked ? (
          <>
            <Unlock className="w-4 h-4" />
            Unlock Gallery
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Lock Gallery (Require Payment)
          </>
        )}
      </button>

      {gallery.is_locked && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs text-amber-700">
            🔒 This gallery is locked. Clients must pay before accessing their photos.
          </p>
        </div>
      )}
    </div>
  )
}
