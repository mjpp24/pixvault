'use client'

import { useState } from 'react'
import { Star, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  galleryId: string
  galleryTitle: string
  coverUrl: string | null
  photographerId: string
  photographer: {
    full_name: string
    business_name: string | null
    logo_url: string | null
    brand_color: string
  }
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

export function ReviewForm({ galleryId, galleryTitle, coverUrl, photographerId, photographer }: Props) {
  const brandColor = photographer.brand_color ?? '#6366f1'
  const displayName = photographer.business_name ?? photographer.full_name

  const [rating, setRating]       = useState(0)
  const [hover, setHover]         = useState(0)
  const [reviewText, setReview]   = useState('')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)

  const submit = async () => {
    if (rating === 0) { toast.error('Please pick a star rating'); return }
    if (!name.trim()) { toast.error('Please enter your name'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographer_id: photographerId,
          gallery_id:      galleryId,
          client_name:     name.trim(),
          client_email:    email.trim() || null,
          rating,
          review_text:     reviewText.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      setDone(true)
    } catch {
      toast.error('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero banner */}
      <div className="relative h-48 sm:h-64 overflow-hidden flex-shrink-0">
        {coverUrl ? (
          <img src={coverUrl} alt={galleryTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: brandColor }} />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          {photographer.logo_url ? (
            <img src={photographer.logo_url} alt={displayName} className="h-10 object-contain mb-3 brightness-0 invert" />
          ) : (
            <p className="text-white/80 text-xs font-bold tracking-[0.3em] uppercase mb-2">{displayName}</p>
          )}
          <h1 className="text-white text-2xl sm:text-3xl font-black">{galleryTitle}</h1>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
          {done ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: brandColor + '18' }}>
                <Check className="w-10 h-10" style={{ color: brandColor }} />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Thank you! 🙏</h2>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                Your review has been submitted. {displayName} really appreciates you taking the time!
              </p>
              {/* Stars summary */}
              <div className="flex justify-center gap-1 mt-5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="w-6 h-6"
                    style={{ fill: s <= rating ? '#f59e0b' : 'transparent', color: s <= rating ? '#f59e0b' : '#e5e7eb' }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-7">
                <h2 className="text-xl font-black text-gray-900">Rate your experience</h2>
                <p className="text-sm text-gray-500 mt-1">
                  How was your session with <span className="font-semibold text-gray-700">{displayName}</span>?
                </p>
              </div>

              {/* Stars */}
              <div className="flex flex-col items-center mb-6">
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star className="w-11 h-11 transition-colors"
                        style={{
                          fill: star <= (hover || rating) ? '#f59e0b' : 'transparent',
                          color: star <= (hover || rating) ? '#f59e0b' : '#d1d5db',
                        }}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm font-semibold mt-2 h-5" style={{ color: brandColor }}>
                  {LABELS[hover || rating] ?? ''}
                </p>
              </div>

              {/* Review text */}
              <textarea
                value={reviewText}
                onChange={e => setReview(e.target.value)}
                placeholder="Tell them what you loved about the experience…"
                rows={4}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 mb-4 resize-none"
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />

              {/* Identity */}
              <div className="space-y-3 mb-6">
                <input
                  type="text"
                  placeholder="Your name *"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2"
                />
                <input
                  type="email"
                  placeholder="Email address (optional)"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2"
                />
              </div>

              <button
                onClick={submit}
                disabled={submitting || rating === 0}
                className="w-full py-4 rounded-2xl text-white font-bold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                {submitting ? 'Submitting…' : 'Submit Review ✨'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                Your review will be seen by {displayName}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-gray-300 tracking-widest uppercase">
        Powered by PixVault
      </div>
    </div>
  )
}
