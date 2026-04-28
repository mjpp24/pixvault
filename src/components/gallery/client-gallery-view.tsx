'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Lock, Eye, EyeOff, CheckSquare, Send, Globe, X, Check, ZoomIn, Download, Share2, ChevronDown, MessageSquare, ArrowRight, CreditCard, Copy, Building2, Star, Volume2, VolumeX } from 'lucide-react'
import { toast } from 'sonner'
import type { GalleryRow, GalleryMedia, PhotographerRow } from '@/types/database'
import { GalleryLightbox } from './gallery-lightbox'
import { createClient } from '@/lib/supabase/client'
import { getLayoutContainerStyle, getItemStyle, getGapPx, getRoundClass, isNaturalLayout } from '@/lib/gallery-layout'
import { DiamondWatermark } from './diamond-watermark'

interface ClientGalleryViewProps {
  gallery: GalleryRow & { photographers: Partial<PhotographerRow> }
  media: GalleryMedia[]
}

const STORAGE_KEY = (galleryId: string, email: string) => `pixvault-selections-${galleryId}-${email}`
const COMMENTS_KEY = (galleryId: string, email: string) => `pixvault-comments-${galleryId}-${email}`


export function ClientGalleryView({ gallery, media }: ClientGalleryViewProps) {
  const supabase = useMemo(() => createClient(), [])
  const photographer = gallery.photographers
  const gridRef = useRef<HTMLDivElement>(null)

  // Password
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordVerified, setPasswordVerified] = useState(!gallery.is_password_protected)
  const [passwordError, setPasswordError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Client identity
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  // Welcome banner (for selection galleries)
  const [showWelcome, setShowWelcome] = useState(gallery.allow_selection)

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Record<string, string>>({}) // mediaId -> comment text
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Per-tile comment
  const [commentingId, setCommentingId] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')

  // Background music
  const audioRef = useRef<HTMLAudioElement>(null)
  const [musicMuted, setMusicMuted] = useState(true)

  // Sticky
  const [scrolled, setScrolled] = useState(false)

  // Payment flow
  const [showPayModal, setShowPayModal]     = useState(false)   // "your files are here" popup
  const [showBankModal, setShowBankModal]   = useState(false)   // bank details modal
  const [payClientName, setPayClientName]   = useState('')
  const [payClientEmail, setPayClientEmail] = useState('')
  const [payNotified, setPayNotified]       = useState(false)   // prevent double-submit

  // Review
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewRating, setReviewRating]       = useState(0)
  const [reviewHover, setReviewHover]         = useState(0)
  const [reviewText, setReviewText]           = useState('')
  const [reviewName, setReviewName]           = useState('')
  const [reviewEmail, setReviewEmail]         = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewDone, setReviewDone]           = useState(false)

  const brandColor = photographer.brand_color ?? '#6366f1'
  const photographerName = (photographer.business_name ?? photographer.full_name ?? '').toUpperCase()

  // ── Notification helper (fire-and-forget) ───────────────────────────────────
  const sendNotification = async (
    type: 'download' | 'selection' | 'payment',
    name: string | null,
    email: string | null,
    message?: string
  ) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographer_id: gallery.photographer_id,
          gallery_id:      gallery.id,
          type,
          client_name:  name  || null,
          client_email: email || null,
          message:      message || null,
        }),
      })
    } catch { /* silent — notifications are non-critical */ }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-play background music (muted by default — browsers block unmuted autoplay)
  useEffect(() => {
    if (gallery.background_music_url && audioRef.current) {
      audioRef.current.volume = 0.4
      audioRef.current.play().catch(() => {})
    }
  }, [gallery.background_music_url])

  useEffect(() => {
    if (clientEmail) {
      const saved = localStorage.getItem(STORAGE_KEY(gallery.id, clientEmail))
      if (saved) try { setSelectedIds(new Set(JSON.parse(saved))) } catch {}
      const savedComments = localStorage.getItem(COMMENTS_KEY(gallery.id, clientEmail))
      if (savedComments) try { setComments(JSON.parse(savedComments)) } catch {}
    }
  }, [gallery.id, clientEmail])

  useEffect(() => {
    if (clientEmail) {
      localStorage.setItem(STORAGE_KEY(gallery.id, clientEmail), JSON.stringify([...selectedIds]))
    }
  }, [selectedIds, gallery.id, clientEmail])

  useEffect(() => {
    if (clientEmail) {
      localStorage.setItem(COMMENTS_KEY(gallery.id, clientEmail), JSON.stringify(comments))
    }
  }, [comments, gallery.id, clientEmail])

  const verifyPassword = () => {
    if (passwordInput === gallery.gallery_password) {
      setPasswordVerified(true)
      setPasswordError('')
    } else {
      setPasswordError('Incorrect password. Please try again.')
    }
  }

  const getPublicUrl = useCallback((path: string) => {
    const { data } = supabase.storage.from('gallery-media').getPublicUrl(path)
    return data.publicUrl
  }, [supabase])

  // Precompute full + compressed thumbnail URLs once per media list.
  // Thumbnail uses Supabase image transforms (width=800, quality=75) to avoid
  // loading full-res photos in small grid cells.
  const urlMap = useMemo(() => {
    const map = new Map<string, { full: string; thumb: string }>()
    for (const item of media) {
      const { data: fullData } = supabase.storage.from('gallery-media').getPublicUrl(item.file_url)
      const full = fullData.publicUrl
      let thumb = full
      if (item.file_type === 'photo') {
        const { data: thumbData } = supabase.storage.from('gallery-media').getPublicUrl(item.file_url, {
          transform: { width: 1600, quality: 90, resize: 'contain' },
        })
        thumb = thumbData.publicUrl
      }
      map.set(item.id, { full, thumb })
    }
    return map
  }, [media, supabase])

  const toggleSelect = (id: string) => {
    if (!selectionMode) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (gallery.max_selections && next.size >= gallery.max_selections) {
          toast.error(`You can only select up to ${gallery.max_selections} photos`)
          return prev
        }
        next.add(id)
      }
      return next
    })
  }

  const setComment = (mediaId: string, text: string) => {
    setComments((prev) => ({ ...prev, [mediaId]: text }))
  }

  const downloadFile = async (url: string, filename: string) => {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  }

  const downloadAll = async () => {
    if (!gallery.allow_download) return
    const toastId = toast.loading(`Starting download — 0 / ${media.length}`)
    let done = 0
    for (const item of media) {
      try {
        await downloadFile(getPublicUrl(item.file_url), item.file_name)
        done++
        toast.loading(`Downloading — ${done} / ${media.length}`, { id: toastId })
        // Small gap so browser doesn't choke on rapid blob creation
        await new Promise((r) => setTimeout(r, 400))
      } catch {
        toast.error(`Failed to download ${item.file_name}`)
      }
    }
    toast.success(`Downloaded ${done} file${done !== 1 ? 's' : ''} 🎉`, { id: toastId })
    sendNotification('download', clientName || null, clientEmail || null,
      `Downloaded ${media.length} file${media.length !== 1 ? 's' : ''} from ${gallery.title}`)
  }

  const shareGallery = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: gallery.title, url: window.location.href })
      } catch (err: unknown) {
        // AbortError = user dismissed the share sheet (not an error)
        // InvalidStateError = previous share still open (ignore)
        if (err instanceof Error && err.name !== 'AbortError' && err.name !== 'InvalidStateError') {
          await navigator.clipboard.writeText(window.location.href)
          toast.success('Link copied!')
        }
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied!')
    }
  }

  // Show review popup after 25s if not already reviewed this gallery
  useEffect(() => {
    const reviewedKey = `pixvault-reviewed-${gallery.id}`
    if (localStorage.getItem(reviewedKey)) return
    const t = setTimeout(() => setShowReviewModal(true), 25_000)
    return () => clearTimeout(t)
  }, [gallery.id])

  // Pre-fill review identity from selection identity if available
  useEffect(() => {
    if (clientName)  setReviewName(clientName)
    if (clientEmail) setReviewEmail(clientEmail)
  }, [clientName, clientEmail])

  const submitReview = async () => {
    if (reviewRating === 0) { toast.error('Please select a star rating'); return }
    setReviewSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographer_id: gallery.photographer_id,
          gallery_id:      gallery.id,
          client_name:     reviewName || null,
          client_email:    reviewEmail || null,
          rating:          reviewRating,
          review_text:     reviewText || null,
        }),
      })
      if (!res.ok) throw new Error()
      localStorage.setItem(`pixvault-reviewed-${gallery.id}`, '1')
      setReviewDone(true)
      setTimeout(() => setShowReviewModal(false), 2500)
    } catch {
      toast.error('Failed to submit review. Please try again.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const scrollToGallery = () => gridRef.current?.scrollIntoView({ behavior: 'smooth' })

  const submitSelections = async () => {
    if (!clientEmail || !clientName) {
      toast.error('Please enter your name and email')
      return
    }
    if (selectedIds.size === 0) {
      toast.error('Please select at least one photo')
      return
    }
    setSubmitting(true)
    try {
      const payload = [...selectedIds].map((mediaId) => ({
        gallery_id: gallery.id,
        media_id: mediaId,
        client_email: clientEmail,
        client_name: clientName,
        comment: comments[mediaId] ?? null,
      }))

      const res = await fetch('/api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections: payload }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(typeof errData.error === 'string' ? errData.error : 'Failed to submit')
      }
      setSubmitted(true)
      setShowSubmitModal(false)
      localStorage.removeItem(STORAGE_KEY(gallery.id, clientEmail))
      localStorage.removeItem(COMMENTS_KEY(gallery.id, clientEmail))
      toast.success('Your selections have been submitted!')
      // Notify photographer
      sendNotification('selection', clientName, clientEmail,
        `Selected ${selectedIds.size} photo${selectedIds.size !== 1 ? 's' : ''} from ${gallery.title}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // — Password screen —
  if (!passwordVerified) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 text-center">
          {photographer.logo_url ? (
            <img src={photographer.logo_url} alt="" className="h-12 object-contain mx-auto mb-4" />
          ) : (
            <p className="text-white font-bold text-xl mb-4">{photographer.business_name ?? photographer.full_name}</p>
          )}
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
          <h2 className="text-white text-lg font-bold">{gallery.title}</h2>
          <p className="text-gray-400 text-sm mt-1 mb-6">This gallery is password protected</p>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
              placeholder="Enter gallery password"
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:border-green-500"
            />
            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordError && <p className="text-red-400 text-xs mt-2">{passwordError}</p>}
          <button
            onClick={verifyPassword}
            className="mt-4 w-full py-3 rounded-lg text-white font-medium text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColor }}
          >
            Access Gallery
          </button>
        </div>
      </div>
    )
  }

  // — Main view —
  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── PAYMENT INTRO POPUP ── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Pay to download files
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              🎉 <span className="font-semibold text-gray-800">Your files are here!</span><br />
              Scroll down and preview the files, then click on the pay button to make payment and download your files.
            </p>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setShowPayModal(false)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setShowPayModal(false); setShowBankModal(true) }}
                className="px-8 py-2.5 rounded-lg text-white text-sm font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BANK DETAILS + PAY CONFIRMATION MODAL ── */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Payment Details</p>
                    <p className="text-xs text-gray-400">Transfer to unlock your gallery</p>
                  </div>
                </div>
                <button onClick={() => setShowBankModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Amount callout */}
            <div className="mx-6 mt-5 rounded-2xl p-4 text-center" style={{ backgroundColor: brandColor + '18' }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: brandColor }}>
                Amount to Pay
              </p>
              <p className="text-3xl font-black text-gray-900">
                {gallery.lock_currency} {gallery.lock_amount?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">{media.length} file{media.length !== 1 ? 's' : ''} · Full resolution</p>
            </div>

            {/* Bank details */}
            <div className="px-6 py-5 space-y-3">
              {[
                { label: 'Bank', value: photographer.bank_name },
                { label: 'Account Name', value: photographer.account_name },
                { label: 'Account Number', value: photographer.account_number },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copied!`) }}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ) : null)}

              {gallery.lock_message && (
                <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed">
                  💬 {gallery.lock_message}
                </p>
              )}
            </div>

            {/* Client identity + CTA */}
            <div className="px-6 pb-6 space-y-3">
              {!payNotified && (
                <>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={payClientName}
                    onChange={(e) => setPayClientName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={payClientEmail}
                    onChange={(e) => setPayClientEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </>
              )}
              <button
                disabled={payNotified}
                onClick={async () => {
                  if (!payClientName || !payClientEmail) {
                    toast.error('Please enter your name and email first')
                    return
                  }
                  await sendNotification('payment', payClientName, payClientEmail,
                    `Sent ${gallery.lock_currency} ${gallery.lock_amount?.toLocaleString()} for ${gallery.title}`)
                  setPayNotified(true)
                  toast.success("Payment notification sent! Your photographer will confirm shortly.")
                }}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: brandColor }}
              >
                {payNotified ? '✓ Notification sent — awaiting confirmation' : "I've made the payment"}
              </button>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Your photographer will confirm and automatically unlock your downloads.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW POPUP ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            {reviewDone ? (
              <div className="px-8 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-lg font-bold text-gray-900">Thank you!</p>
                <p className="text-sm text-gray-500 mt-1">Your review means a lot 🙏</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">
                        {photographer.business_name ?? photographer.full_name}
                      </p>
                      <h2 className="text-lg font-bold text-gray-900">How was your experience?</h2>
                      <p className="text-sm text-gray-500 mt-0.5">Your feedback helps the photographer grow 🌟</p>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.setItem(`pixvault-reviewed-${gallery.id}`, '1')
                        setShowReviewModal(false)
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Star rating */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setReviewHover(star)}
                          onMouseLeave={() => setReviewHover(0)}
                          className="transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            className="w-9 h-9 transition-colors"
                            style={{
                              fill: star <= (reviewHover || reviewRating) ? '#f59e0b' : 'transparent',
                              color: star <= (reviewHover || reviewRating) ? '#f59e0b' : '#d1d5db',
                            }}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 h-4">
                      {reviewHover === 1 || reviewRating === 1 ? 'Poor' :
                       reviewHover === 2 || reviewRating === 2 ? 'Fair' :
                       reviewHover === 3 || reviewRating === 3 ? 'Good' :
                       reviewHover === 4 || reviewRating === 4 ? 'Great' :
                       reviewHover === 5 || reviewRating === 5 ? 'Excellent! ✨' : ''}
                    </p>
                  </div>

                  {/* Review text */}
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Tell them what you loved (optional)…"
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />

                  {/* Name + email */}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Your name"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={reviewEmail}
                      onChange={(e) => setReviewEmail(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        localStorage.setItem(`pixvault-reviewed-${gallery.id}`, '1')
                        setShowReviewModal(false)
                      }}
                      className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Maybe later
                    </button>
                    <button
                      onClick={submitReview}
                      disabled={reviewSubmitting || reviewRating === 0}
                      className="flex-2 flex-grow py-3 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: brandColor }}
                    >
                      {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── WELCOME BANNER (selection galleries only) ── */}
      {showWelcome && gallery.allow_selection && !submitted && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center border border-white/10">
            {photographer.logo_url ? (
              <img src={photographer.logo_url} alt="" className="h-10 object-contain mx-auto mb-5 brightness-0 invert" />
            ) : (
              <p className="text-white/60 text-xs tracking-widest uppercase mb-4">{photographerName}</p>
            )}
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">{gallery.title}</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Hi! Your photographer has shared this gallery for you to select your favourite photos.
              {gallery.max_selections ? ` Please choose up to ${gallery.max_selections} photos.` : ' Select as many as you like.'}
              {' '}You can also add notes to each photo with any editing requests.
            </p>
            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Your full name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-white/10 text-white placeholder:text-white/30 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/50"
              />
              <input
                type="email"
                placeholder="Your email address"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full bg-white/10 text-white placeholder:text-white/30 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/50"
              />
            </div>
            <button
              onClick={() => {
                if (!clientName || !clientEmail) { toast.error('Please enter your name and email to continue'); return }
                setShowWelcome(false)
                setSelectionMode(true)
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: brandColor }}
            >
              Start Selecting Photos
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowWelcome(false)}
              className="mt-3 text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              Browse first without selecting
            </button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden flex flex-col items-center justify-center">
        {gallery.cover_photo_url ? (
          <img src={gallery.cover_photo_url} alt={gallery.title} className="absolute inset-0 w-full h-full object-cover" fetchPriority="high" decoding="async" style={{ imageRendering: 'auto' }} />
        ) : (
          <div className="absolute inset-0 bg-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />

        {/* Photographer branding top */}
        <div className="absolute top-8 left-0 right-0 flex justify-center">
          {photographer.logo_url ? (
            <img src={photographer.logo_url} alt="" className="h-10 object-contain brightness-0 invert opacity-90" />
          ) : (
            <p className="text-white/80 text-sm font-semibold tracking-[0.25em] uppercase">{photographerName}</p>
          )}
        </div>

        {/* Center content */}
        <div className="relative z-10 text-center px-6">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white uppercase drop-shadow-2xl">
            {gallery.title}
          </h1>

          {/* Show PAY button when: locked OR has amount but downloads blocked */}
          {(gallery.is_locked || (gallery.lock_amount && !gallery.allow_download)) ? (
            <div className="mt-8 space-y-4">
              <button
                onClick={() => setShowPayModal(true)}
                className="inline-flex items-center gap-3 border-2 border-white text-white px-10 py-4 text-base font-bold tracking-[0.25em] uppercase hover:bg-white hover:text-black transition-all duration-200"
              >
                {media.length} FILES — PAY {gallery.lock_currency}{' '}
                {gallery.lock_amount ? gallery.lock_amount.toLocaleString() : ''}
              </button>
              <p className="text-white/40 text-xs max-w-xs mx-auto leading-relaxed">
                {gallery.lock_message ?? 'Complete payment to unlock full resolution downloads.'}
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              <button
                onClick={scrollToGallery}
                className="inline-block border border-white/80 text-white px-10 py-3 text-sm font-semibold tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-all duration-200"
              >
                {gallery.allow_selection ? 'Select Photos' : 'View Gallery'}
              </button>
            </div>
          )}
        </div>

        {/* Photographer credit bottom */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <p className="text-white/50 text-xs tracking-[0.3em] uppercase">
            {photographer.business_name ?? photographer.full_name}
          </p>
        </div>

        {!gallery.is_locked && (
          <button onClick={scrollToGallery} className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/40 hover:text-white/80 transition-colors animate-bounce">
            <ChevronDown className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ── STICKY TOOLBAR ── */}
      <div className={`sticky top-0 z-30 transition-all duration-300 ${scrolled ? 'bg-black/95 backdrop-blur-md' : 'bg-black/60 backdrop-blur-sm'} border-b border-white/10`}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-bold tracking-wide">{gallery.title}</p>
            <p className="text-white/40 text-xs tracking-widest uppercase">{photographer.business_name ?? photographer.full_name}</p>
          </div>
          <div className="flex items-center gap-1">
            {/* Selection toggle */}
            {gallery.allow_selection && !submitted && (
              <button
                onClick={() => {
                  if (!selectionMode && (!clientName || !clientEmail)) {
                    setShowWelcome(true)
                    return
                  }
                  setSelectionMode(!selectionMode)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors ${
                  selectionMode ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                {selectionMode ? `${selectedIds.size} selected` : 'Select'}
              </button>
            )}
            {/* Download all */}
            {gallery.allow_download && (
              <button
                onClick={downloadAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Download all photos"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download All</span>
              </button>
            )}
            {/* Music mute/unmute */}
            {gallery.background_music_url && (
              <button
                onClick={() => {
                  if (!audioRef.current) return
                  const next = !musicMuted
                  audioRef.current.muted = next
                  if (!next) audioRef.current.play().catch(() => {})
                  setMusicMuted(next)
                }}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                title={musicMuted ? 'Unmute music' : 'Mute music'}
              >
                {musicMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
            <button onClick={shareGallery} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            {photographer.instagram && (
              <a href={`https://instagram.com/${photographer.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors text-xs font-bold">IG</a>
            )}
            {photographer.website && (
              <a href={photographer.website} target="_blank" rel="noopener noreferrer" className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors">
                <Globe className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        {/* Selection progress bar */}
        {selectionMode && gallery.max_selections && (
          <div className="h-0.5 bg-white/10">
            <div
              className="h-full bg-green-400 transition-all duration-300"
              style={{ width: `${(selectedIds.size / gallery.max_selections) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ── SELECTION GALLERY NOTICE ── */}
      {gallery.gallery_type === 'selection' && (
        <div className="bg-purple-950/80 backdrop-blur-sm border-b border-purple-800/50 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
            <p className="text-purple-200 text-xs font-medium">
              <span className="font-bold text-purple-100">Selection Preview</span> — These are watermarked proofs. Pick your favourites and your photographer will deliver the final images.
            </p>
          </div>
        </div>
      )}

      {/* ── PHOTO GRID ── */}
      <div ref={gridRef} className="bg-black">
        {gallery.is_locked ? (
          <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0.5 blur-sm pointer-events-none select-none">
              {media.slice(0, 8).map((item) => (
                <div key={item.id} className="aspect-square bg-gray-900 overflow-hidden">
                  <img src={urlMap.get(item.id)?.thumb ?? ''} alt="" className="w-full h-full object-cover opacity-40" loading="lazy" decoding="async" />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-8 max-w-sm border border-white/10">
                <Lock className="w-10 h-10 text-amber-400 mx-auto mb-4" />
                <h3 className="text-white text-xl font-bold">
                  {gallery.lock_amount ? `${gallery.lock_currency} ${gallery.lock_amount.toLocaleString()}` : 'Payment Required'}
                </h3>
                <p className="text-white/60 text-sm mt-2 leading-relaxed">
                  {gallery.lock_message ?? 'Complete your payment to access all your photos.'}
                </p>
                <p className="text-white/40 text-xs mt-4">Contact {photographer.full_name ?? photographer.business_name}</p>
              </div>
            </div>
          </div>
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <p className="text-white/30 text-lg">No photos available yet.</p>
          </div>
        ) : (
          <div style={getLayoutContainerStyle(
            gallery.gallery_layout ?? 'classic-grid',
            getGapPx(gallery.grid_spacing)
          )}>
            {media.map((item, index) => {
              const urls = urlMap.get(item.id)
              const isSelected = selectedIds.has(item.id)
              const hasNote = !!comments[item.id]
              const layout = gallery.gallery_layout ?? 'classic-grid'
              const roundClass = getRoundClass(gallery.grid_roundness)
              const aboveFold = index < 6
              const gapPx = getGapPx(gallery.grid_spacing)
              const natural = isNaturalLayout(layout)

              if (natural) {
                // Natural layout: photo shows at its own aspect ratio — no crop, no borders, no zoom
                return (
                  <div
                    key={item.id}
                    className="break-inside-avoid"
                    style={{ marginBottom: `${gapPx}px` }}
                  >
                    <div
                      className={`relative cursor-pointer group ${roundClass} ${isSelected ? 'brightness-90' : ''}`}
                      onClick={() => setLightboxIndex(index)}
                    >
                      <img
                        src={urls?.thumb ?? ''}
                        alt={item.file_name}
                        className="w-full h-auto block transition-opacity duration-200 group-hover:opacity-90"
                        loading={aboveFold ? 'eager' : 'lazy'}
                        fetchPriority={aboveFold ? 'high' : 'auto'}
                        decoding="async"
                      />
                      {(gallery.gallery_type === 'selection' || !gallery.allow_download) && (
                        <DiamondWatermark filename={item.file_name} />
                      )}
                      {isSelected && <div className="absolute inset-0 ring-4 ring-green-400 ring-inset pointer-events-none" />}
                      {selectionMode && (
                        <button className="absolute top-2.5 right-2.5 z-20" onClick={(e) => { e.stopPropagation(); toggleSelect(item.id) }}>
                          {isSelected
                            ? <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg bg-green-500"><Check className="w-4 h-4 text-white" /></div>
                            : <div className="w-7 h-7 rounded-full border-2 border-white/70 bg-black/30 shadow-lg group-hover:border-white" />}
                        </button>
                      )}
                      {selectionMode && (
                        <div className="absolute bottom-2.5 left-2.5 z-20">
                          <button
                            onClick={(e) => { e.stopPropagation(); setCommentDraft(comments[item.id] ?? ''); setCommentingId(item.id) }}
                            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${hasNote ? 'bg-amber-500 text-white' : 'bg-black/50 text-white/80 hover:bg-black/70'}`}
                          >
                            <MessageSquare className="w-2.5 h-2.5" />{hasNote ? 'Note' : 'Note'}
                          </button>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 z-10">
                        <ZoomIn className="w-7 h-7 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  </div>
                )
              }

              // Fixed-ratio grid layouts (masonry, spotlight, editorial etc.)
              const itemStyle = getItemStyle(index, layout)
              return (
                <div key={item.id} className={`relative cursor-pointer group ${isSelected ? 'brightness-90' : ''}`} style={itemStyle} onClick={() => setLightboxIndex(index)}>
                  <div className={`absolute inset-0 overflow-hidden ${roundClass}`}>
                    <img src={urls?.thumb ?? ''} alt={item.file_name} className="w-full h-full object-cover block transition-opacity duration-200 group-hover:opacity-90" loading={aboveFold ? 'eager' : 'lazy'} fetchPriority={aboveFold ? 'high' : 'auto'} decoding="async" />
                    {(gallery.gallery_type === 'selection' || !gallery.allow_download) && <DiamondWatermark filename={item.file_name} />}
                    {isSelected && <div className="absolute inset-0 ring-4 ring-green-400 ring-inset pointer-events-none" />}
                    {selectionMode && (
                      <button className="absolute top-2.5 right-2.5 z-20" onClick={(e) => { e.stopPropagation(); toggleSelect(item.id) }}>
                        {isSelected ? <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg bg-green-500"><Check className="w-4 h-4 text-white" /></div> : <div className="w-7 h-7 rounded-full border-2 border-white/70 bg-black/30 shadow-lg" />}
                      </button>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 z-10"><ZoomIn className="w-7 h-7 text-white drop-shadow-lg" /></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── FLOATING SELECTION BAR ── */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 bg-white rounded-2xl shadow-2xl px-5 py-3">
            <span className="text-sm font-medium text-gray-900">
              {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''} selected
              {gallery.max_selections ? ` / ${gallery.max_selections}` : ''}
            </span>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: brandColor }}
            >
              <Send className="w-4 h-4" />
              Submit
            </button>
          </div>
        </div>
      )}

      {/* ── SUBMIT MODAL ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Submit Your Selections</h3>
              <button onClick={() => setShowSubmitModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-1">
              You&apos;ve selected <strong>{selectedIds.size} photos</strong>.
            </p>
            {Object.keys(comments).filter(id => selectedIds.has(id)).length > 0 && (
              <p className="text-xs text-amber-600 mb-4">
                {Object.keys(comments).filter(id => selectedIds.has(id)).length} photo{Object.keys(comments).filter(id => selectedIds.has(id)).length !== 1 ? 's' : ''} with editing notes included.
              </p>
            )}
            {!clientName || !clientEmail ? (
              <div className="space-y-3 mb-4">
                <input type="text" placeholder="Your full name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
                <input type="email" placeholder="Your email address" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-4">Submitting as <strong className="text-gray-700">{clientName}</strong> ({clientEmail})</p>
            )}
            <button
              onClick={submitSelections}
              disabled={submitting}
              className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-60 transition-opacity hover:opacity-90"
              style={{ backgroundColor: brandColor }}
            >
              {submitting ? 'Submitting...' : 'Confirm & Submit Selections'}
            </button>
          </div>
        </div>
      )}

      {/* ── PER-IMAGE COMMENT MODAL ── */}
      {commentingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setCommentingId(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Add a Note</h3>
              <button onClick={() => setCommentingId(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Any editing instructions or requests for this photo?</p>
            <textarea
              autoFocus
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="e.g. Please brighten this one and remove the background…"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              {comments[commentingId] && (
                <button
                  onClick={() => { setComment(commentingId, ''); setCommentingId(null) }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => {
                  setComment(commentingId, commentDraft.trim())
                  setCommentingId(null)
                }}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── LIGHTBOX ── */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          media={media}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          getUrl={getPublicUrl}
          selectedIds={selectedIds}
          onToggleSelect={gallery.allow_selection ? toggleSelect : undefined}
          showSelectMode={gallery.allow_selection && selectionMode}
          watermark={!gallery.allow_download}
          comments={comments}
          onComment={gallery.allow_selection && selectionMode ? setComment : undefined}
        />
      )}

      {/* Background music */}
      {gallery.background_music_url && (
        <audio
          ref={audioRef}
          src={gallery.background_music_url}
          loop
          muted
          preload="auto"
        />
      )}

      {/* Footer */}
      <div className="text-center py-8 border-t border-white/5 text-white/20 text-xs tracking-widest uppercase">
        Powered by PixVault
      </div>
    </div>
  )
}
