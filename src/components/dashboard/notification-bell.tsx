'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, Download, CheckSquare, CreditCard,
  ExternalLink, Check, X, RefreshCw, Star, Copy, MessageCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { TEMPLATES } from '@/components/review/review-templates'

interface Notification {
  id: string
  type: 'download' | 'selection' | 'payment' | 'review'
  client_name: string | null
  client_email: string | null
  message: string | null
  is_read: boolean
  created_at: string
  gallery_id: string | null
  galleries: { title: string; slug: string; cover_photo_url: string | null } | null
  metadata: { review_id?: string; rating?: number } | null
}

const TYPE_META = {
  download:  { Icon: Download,    color: 'bg-green-100 text-green-600',  dot: 'bg-green-500'  },
  selection: { Icon: CheckSquare, color: 'bg-violet-100 text-violet-600',  dot: 'bg-violet-500'  },
  payment:   { Icon: CreditCard,  color: 'bg-amber-100  text-amber-600',   dot: 'bg-amber-500'   },
  review:    { Icon: Star,        color: 'bg-yellow-100 text-yellow-600',  dot: 'bg-yellow-500'  },
}

function timeAgo(date: string) {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }) } catch { return 'recently' }
}
function formatNotifDate(date: string) {
  try {
    const d = new Date(date), now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString('en', { weekday: 'long' })
    return d.toLocaleDateString('en', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined })
  } catch { return '' }
}
function parseReviewMessage(message: string | null): { rating: number; text: string } {
  if (!message) return { rating: 5, text: '' }
  const rating = (message.match(/★/g) ?? []).length
  const match = message.match(/ — (.+)$/)
  return { rating: Math.max(1, Math.min(5, rating || 5)), text: match ? match[1].trim() : '' }
}

// Modal width for scaling templates
const MODAL_W = 328

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reviewModal, setReviewModal] = useState<{ link: string; clientName: string | null } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [reviewPreview, setReviewPreview] = useState<{
    notif: Notification
    rating: number
    text: string
    templateIdx: number
  } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setNotifications((await res.json()).notifications ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const t = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(t)
  }, [fetchNotifications])

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  const handleAction = async (notif: Notification, action: 'read' | 'confirm_payment' | 'delete') => {
    setActionLoading(notif.id + action)
    try {
      if (action === 'delete') {
        await fetch(`/api/notifications/${notif.id}`, { method: 'DELETE' })
        setNotifications(prev => prev.filter(n => n.id !== notif.id))
        return
      }
      const res = await fetch(`/api/notifications/${notif.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      if (action === 'confirm_payment') { toast.success('Payment confirmed'); router.refresh() }
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    } catch { toast.error('Action failed. Try again.') }
    finally { setActionLoading(null) }
  }

  const openReviewPreview = (notif: Notification) => {
    const { rating, text } = parseReviewMessage(notif.message)
    setReviewPreview({ notif, rating, text, templateIdx: Math.floor(Math.random() * TEMPLATES.length) })
    setOpen(false)
  }

  const requestReview = (notif: Notification) => {
    const slug = notif.galleries?.slug
    if (!slug) { toast.error('Gallery slug not available'); return }
    setReviewModal({ link: `${window.location.origin}/review/${slug}`, clientName: notif.client_name })
    setLinkCopied(false)
  }

  const copyReviewLink = async (link: string) => {
    await navigator.clipboard.writeText(link)
    setLinkCopied(true)
    toast.success('Review link copied!')
    setTimeout(() => setLinkCopied(false), 2500)
  }

  const markAllRead = async () => {
    await Promise.all(
      notifications.filter(n => !n.is_read).map(n =>
        fetch(`/api/notifications/${n.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'read' }),
        })
      )
    )
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  return (
    <div ref={panelRef} className="relative">

      {/* ── REVIEW PREVIEW MODAL ── */}
      {reviewPreview && (() => {
        const { notif, rating, text, templateIdx } = reviewPreview
        const tmpl = TEMPLATES[templateIdx]
        const photo = notif.galleries?.cover_photo_url ?? ''
        const clientName = notif.client_name ?? notif.client_email ?? 'Client'
        const reviewId = notif.metadata?.review_id
        const scale = MODAL_W / tmpl.w
        const scaledH = Math.round(tmpl.h * scale)

        const props = {
          photo, clientName, rating, reviewText: text || 'Amazing experience!',
          bizName: '', brandColor: '#6366f1',
          width: tmpl.w, height: tmpl.h,
        }

        const waText = `${'⭐'.repeat(rating)}\n"${text}"\n— ${clientName}`

        const prev = () => setReviewPreview(p => p ? { ...p, templateIdx: (p.templateIdx - 1 + TEMPLATES.length) % TEMPLATES.length } : p)
        const next = () => setReviewPreview(p => p ? { ...p, templateIdx: (p.templateIdx + 1) % TEMPLATES.length } : p)

        return (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setReviewPreview(null)}>
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              style={{ width: MODAL_W + 32 }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{clientName}&apos;s Review</p>
                  <p className="text-xs text-gray-400">{notif.galleries?.title} · template {templateIdx + 1}/{TEMPLATES.length}</p>
                </div>
                <button onClick={() => setReviewPreview(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Template — scaled to fit modal */}
              <div className="relative mx-4 overflow-hidden rounded-2xl shadow-lg" style={{ height: scaledH }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: tmpl.w, height: tmpl.h }}>
                  <tmpl.Component {...props} />
                </div>

                {/* Prev / Next arrows overlaid on the template */}
                <button onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-1.5 py-3">
                {TEMPLATES.map((_, i) => (
                  <button key={i} onClick={() => setReviewPreview(p => p ? { ...p, templateIdx: i } : p)}
                    className={`rounded-full transition-all ${i === templateIdx ? 'w-5 h-2 bg-green-600' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'}`} />
                ))}
              </div>

              {/* Action buttons */}
              <div className="px-4 pb-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (reviewId) { setReviewPreview(null); router.push(`/reviews/${reviewId}`) }
                    else next()
                  }}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  <ChevronRight className="w-4 h-4" />
                  {reviewId ? 'More designs' : 'Next design'}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Share review
                </a>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── REQUEST REVIEW LINK MODAL ── */}
      {reviewModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setReviewModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Request Review</p>
                  <p className="text-xs text-gray-400">
                    {reviewModal.clientName ? `Share with ${reviewModal.clientName}` : 'Share this link with your client'}
                  </p>
                </div>
              </div>
              <button onClick={() => setReviewModal(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-4">
              <p className="text-xs font-mono text-gray-600 break-all leading-relaxed">{reviewModal.link}</p>
            </div>
            <div className="space-y-2.5">
              <button onClick={() => copyReviewLink(reviewModal.link)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
                {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {linkCopied ? 'Copied!' : 'Copy Link'}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Hi ${reviewModal.clientName ?? 'there'} 😊\n\nThanks for choosing us! Could you please rate our service here?\n${reviewModal.link}\n\nYour feedback means a lot!`)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors">
                <MessageCircle className="w-4 h-4" />
                Send via WhatsApp
              </a>
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">Client clicks the link → leaves a star rating & review</p>
          </div>
        </div>
      )}

      {/* Bell */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications() }}
        className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex flex-col max-h-[560px]">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-green-600" />
              <span className="font-bold text-gray-900 text-sm">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{unread} new</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-green-600 hover:underline font-semibold">Mark all read</button>
              )}
              <button onClick={fetchNotifications}
                className={`p-1 text-gray-400 hover:text-gray-700 transition-colors rounded ${loading ? 'animate-spin' : ''}`}>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-300">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <Bell className="w-8 h-8 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400">All caught up</p>
                <p className="text-xs text-gray-300 mt-1">Client actions will show here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notif) => {
                  const meta = TYPE_META[notif.type]
                  const galleryTitle = notif.galleries?.title ?? 'Gallery'
                  const clientLabel = notif.client_name ?? notif.client_email ?? 'A client'
                  const isLoadingConfirm = actionLoading === notif.id + 'confirm_payment'
                  const isLoadingDelete  = actionLoading === notif.id + 'delete'

                  return (
                    <div key={notif.id} className={`px-5 py-4 transition-colors ${notif.is_read ? 'bg-white' : 'bg-green-50/40'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                          <meta.Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            {!notif.is_read && <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${meta.dot}`} />}
                            <p className="text-sm text-gray-800 leading-snug">
                              <span className="font-bold">{clientLabel}</span>{' '}
                              {notif.type === 'download'  ? 'downloaded files from' :
                               notif.type === 'selection' ? 'made a selection in' :
                               notif.type === 'payment'   ? 'sent payment for' :
                               notif.type === 'review'    ? <>has reviewed — <span className="font-bold text-green-600 uppercase">{galleryTitle}</span>, share the review on your business social profiles!</> :
                                                            'left a review for'}
                              {notif.type !== 'review' && <>{' '}<span className="font-semibold text-green-600">{galleryTitle}</span></>}
                            </p>
                          </div>

                          {notif.message && (
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{notif.message}</p>
                          )}

                          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                            <span className="font-medium text-gray-500">{formatNotifDate(notif.created_at)}</span>
                            <span>·</span>
                            <span>{timeAgo(notif.created_at)}</span>
                          </p>

                          <div className="flex items-center flex-wrap gap-2 mt-3">
                            <button onClick={() => handleAction(notif, 'delete')} disabled={!!isLoadingDelete}
                              className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                              {isLoadingDelete ? <RefreshCw className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                              Delete
                            </button>

                            {notif.type === 'payment' && (
                              <button onClick={() => handleAction(notif, 'confirm_payment')} disabled={!!isLoadingConfirm}
                                className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                                {isLoadingConfirm ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Confirm Payment
                              </button>
                            )}

                            {notif.type === 'selection' && notif.gallery_id && (
                              <a href={`/galleries/${notif.gallery_id}/selections`} onClick={() => setOpen(false)}
                                className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors">
                                <ExternalLink className="w-3 h-3" />
                                View Selections
                              </a>
                            )}

                            {notif.type === 'review' && (
                              <button onClick={() => openReviewPreview(notif)}
                                className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors">
                                <Star className="w-3 h-3" />
                                Open review
                              </button>
                            )}

                            {notif.type === 'download' && (
                              <>
                                {notif.gallery_id && (
                                  <a href={`/galleries/${notif.gallery_id}`} onClick={() => setOpen(false)}
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors">
                                    <ExternalLink className="w-3 h-3" />
                                    View Gallery
                                  </a>
                                )}
                                <button onClick={() => requestReview(notif)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors">
                                  <Star className="w-3 h-3" />
                                  Request Review
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-2.5 flex-shrink-0">
              <p className="text-[11px] text-gray-400 text-center">
                Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
