'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Download, MessageSquare, Check } from 'lucide-react'
import type { GalleryMedia } from '@/types/database'
import { DiamondWatermark } from './diamond-watermark'
import { RAW_EXTENSIONS } from '@/lib/utils'

interface GalleryLightboxProps {
  media: GalleryMedia[]
  initialIndex: number
  onClose: () => void
  getUrl: (path: string) => string
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  showSelectMode?: boolean
  watermark?: boolean
  comments?: Record<string, string>
  onComment?: (mediaId: string, text: string) => void
}

export function GalleryLightbox({
  media,
  initialIndex,
  onClose,
  getUrl,
  selectedIds,
  onToggleSelect,
  showSelectMode = false,
  watermark = false,
  comments = {},
  onComment,
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [showCommentBox, setShowCommentBox] = useState(false)
  const [commentText, setCommentText] = useState('')
  const touchStartX = useRef<number>(0)
  const commentRef = useRef<HTMLTextAreaElement>(null)

  const item = media[currentIndex]
  // For RAW files browsers can't render the original — use the extracted JPEG thumbnail
  const isRaw = item
    ? RAW_EXTENSIONS.has(item.file_name.split('.').pop()?.toLowerCase() ?? '')
    : false
  const displayPath = item
    ? (isRaw && item.thumbnail_url ? item.thumbnail_url : item.file_url)
    : ''
  const url = displayPath ? getUrl(displayPath) : ''

  const prev = useCallback(() => {
    setShowCommentBox(false)
    setCurrentIndex((i) => Math.max(0, i - 1))
  }, [])
  const next = useCallback(() => {
    setShowCommentBox(false)
    setCurrentIndex((i) => Math.min(media.length - 1, i + 1))
  }, [media.length])

  useEffect(() => {
    if (item) setCommentText(comments[item.id] ?? '')
  }, [currentIndex, item, comments])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (showCommentBox) setShowCommentBox(false); else onClose() }
      if (!showCommentBox && e.key === 'ArrowLeft') prev()
      if (!showCommentBox && e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next, showCommentBox])

  useEffect(() => {
    if (showCommentBox) commentRef.current?.focus()
  }, [showCommentBox])

  if (!item) return null

  const saveComment = () => {
    if (onComment) onComment(item.id, commentText)
    setShowCommentBox(false)
  }

  const hasComment = !!comments[item.id]
  const isSelected = selectedIds?.has(item.id)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/97 flex items-center justify-center"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX
        if (diff > 50) next()
        if (diff < -50) prev()
      }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-20 bg-gradient-to-b from-black/70 to-transparent">
        <span className="text-white/50 text-sm">{currentIndex + 1} / {media.length}</span>
        <div className="flex items-center gap-2">
          {showSelectMode && onComment && (
            <button
              onClick={() => setShowCommentBox(!showCommentBox)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                hasComment ? 'bg-amber-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {hasComment ? 'Note added' : 'Add note'}
            </button>
          )}
          {showSelectMode && onToggleSelect && (
            <button
              onClick={() => onToggleSelect(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isSelected ? 'bg-green-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5" />}
              {isSelected ? 'Selected' : 'Select'}
            </button>
          )}
          {!watermark && (
            <a
              href={url}
              download={item.file_name}
              className="p-2 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          <button onClick={onClose} className="p-2 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prev */}
      {currentIndex > 0 && (
        <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors z-20">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Main image */}
      <div className="relative w-full h-full flex items-center justify-center px-14 py-16">
        {item.file_type === 'photo' ? (
          <div className="relative inline-flex items-center justify-center max-w-full max-h-full">
            <img
              src={url}
              alt={item.file_name}
              className="max-w-full max-h-[calc(100vh-8rem)] object-contain select-none block"
              draggable={false}
              onContextMenu={(e) => watermark && e.preventDefault()}
            />
            {/* Identical diamond-crosshatch overlay as the grid tiles */}
            {watermark && <DiamondWatermark filename={item.file_name} />}
          </div>
        ) : (
          <video src={url} controls autoPlay className="max-w-full max-h-[calc(100vh-8rem)]" />
        )}
      </div>

      {/* Next */}
      {currentIndex < media.length - 1 && (
        <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors z-20">
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-3 bg-gradient-to-t from-black/60 to-transparent z-20">
        <span className="text-white/40 text-xs">{item.file_name}</span>
        {hasComment && !showCommentBox && (
          <button onClick={() => setShowCommentBox(true)} className="text-amber-400 text-xs flex items-center gap-1 hover:text-amber-300">
            <MessageSquare className="w-3 h-3" />
            {comments[item.id]}
          </button>
        )}
      </div>

      {/* Comment panel */}
      {showCommentBox && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gray-950 border-t border-white/10 p-4">
          <p className="text-white/50 text-xs mb-2 font-medium uppercase tracking-wide">Note for photographer</p>
          <textarea
            ref={commentRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="E.g. Please crop tighter, remove background, colour correction..."
            rows={3}
            className="w-full bg-white/10 text-white placeholder:text-white/30 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/50 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowCommentBox(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={saveComment} className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
