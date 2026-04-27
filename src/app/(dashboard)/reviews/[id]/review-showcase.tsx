'use client'

import { useState, useRef, useCallback } from 'react'
import { ArrowLeft, Download, Share2, Star, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { TEMPLATES, Stars, type TemplateProps } from '@/components/review/review-templates'

interface Review {
  id: string
  client_name: string | null
  client_email: string | null
  rating: number
  review_text: string | null
  created_at: string
  gallery_id: string
  galleries: { id: string; title: string; slug: string; cover_photo_url: string | null } | null
}

interface Photographer {
  full_name: string
  business_name: string | null
  logo_url: string | null
  brand_color: string
}

interface MediaItem {
  id: string
  file_url: string
  thumbnail_url: string | null
  file_name: string
  file_type: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const mediaUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/gallery-media/${path}`

export function ReviewShowcase({ review, photographer, media }: { review: Review; photographer: Photographer; media: MediaItem[] }) {
  const brandColor = photographer.brand_color ?? '#6366f1'
  const bizName = (photographer.business_name ?? photographer.full_name ?? '').toUpperCase()
  const clientName = review.client_name ?? 'Anonymous'
  const reviewText = review.review_text ?? 'Excellent service — highly recommended!'
  const galleryTitle = review.galleries?.title ?? ''

  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const templateRef = useRef<HTMLDivElement>(null)

  const coverUrl = review.galleries?.cover_photo_url ?? (media[0] ? mediaUrl(media[0].file_url) : '')
  const photoOptions = [
    ...(coverUrl ? [{ label: 'Cover Photo', url: coverUrl }] : []),
    ...media.map((m) => ({ label: m.file_name, url: mediaUrl(m.file_url) })),
  ]
  const activePhoto = photoOptions[selectedPhoto]?.url ?? coverUrl

  const tmpl = TEMPLATES[selectedTemplate]
  const props: TemplateProps = { photo: activePhoto, clientName, rating: review.rating, reviewText, bizName, brandColor, width: tmpl.w, height: tmpl.h }

  const downloadTemplate = useCallback(async () => {
    if (!templateRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(templateRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: null,
      })
      const link = document.createElement('a')
      link.download = `review-${clientName.toLowerCase().replace(/\s+/, '-')}-template${tmpl.id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Template downloaded!')
    } catch {
      toast.error('Download failed — try a different template')
    } finally {
      setDownloading(false)
    }
  }, [clientName, tmpl.id])

  const copyShareText = async () => {
    const stars = '⭐'.repeat(review.rating)
    const text = `${stars}\n"${reviewText}"\n— ${clientName}\n\n📸 ${bizName}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Review text copied!')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Link href="/reviews" className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">Review from {clientName}</h1>
          <p className="text-xs text-gray-400">{galleryTitle} · {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyShareText}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy text'}
          </button>
          <button onClick={downloadTemplate} disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: brandColor }}>
            <Download className="w-4 h-4" />
            {downloading ? 'Generating…' : 'Download'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

        {/* Left: Template preview */}
        <div>
          <h2 className="font-bold text-gray-900 mb-4">Design Templates</h2>

          {/* Template grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {TEMPLATES.map((t, i) => {
              const scale = 200 / Math.max(t.w, t.h)
              return (
                <div key={t.id} onClick={() => setSelectedTemplate(i)} role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedTemplate(i)}
                  className={`group relative rounded-2xl overflow-hidden border-2 transition-all bg-white cursor-pointer ${selectedTemplate === i ? 'border-green-500 shadow-lg shadow-green-100' : 'border-gray-100 hover:border-green-300'}`}
                  style={{ height: 200 }}>
                  <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: t.w, height: t.h, pointerEvents: 'none' }}>
                    <t.Component {...props} width={t.w} height={t.h} />
                  </div>
                  <div className={`absolute bottom-0 inset-x-0 py-1.5 text-[10px] font-bold text-center transition-colors ${selectedTemplate === i ? 'bg-green-600 text-white' : 'bg-black/40 text-white/80'}`}>
                    {t.name}
                  </div>
                  {selectedTemplate === i && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedTemplate(i); setTimeout(downloadTemplate, 100) }}
                      className="p-1.5 bg-white/90 rounded-lg shadow text-gray-700 hover:text-green-600 transition-colors">
                      <Download className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); copyShareText() }}
                      className="p-1.5 bg-white/90 rounded-lg shadow text-gray-700 hover:text-green-600 transition-colors">
                      <Share2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Full-size active preview */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">Preview — {tmpl.name}</h3>
            <div className="flex gap-1">
              <button onClick={() => setSelectedTemplate(i => Math.max(0, i - 1))} disabled={selectedTemplate === 0}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setSelectedTemplate(i => Math.min(TEMPLATES.length - 1, i + 1))} disabled={selectedTemplate === TEMPLATES.length - 1}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex justify-center bg-[#f0f0f0] rounded-2xl p-6 shadow-inner">
            <div ref={templateRef} style={{ display: 'inline-block', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
              <tmpl.Component {...props} />
            </div>
          </div>
        </div>

        {/* Right: Customise panel */}
        <div className="space-y-5">
          {/* Review card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Review details</h3>
            <div className="flex gap-1 mb-2">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className="w-5 h-5" style={{ fill: s <= review.rating ? '#f59e0b' : 'transparent', color: s <= review.rating ? '#f59e0b' : '#d1d5db' }} />
              ))}
              <span className="text-sm font-semibold text-gray-700 ml-1">{review.rating}/5</span>
            </div>
            <p className="text-sm text-gray-700 italic leading-relaxed">"{reviewText}"</p>
            <p className="text-xs text-gray-500 font-semibold mt-2">— {clientName}</p>
            {review.client_email && <p className="text-xs text-gray-400">{review.client_email}</p>}
          </div>

          {/* Photo selector */}
          {photoOptions.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Choose photo</h3>
              <div className="grid grid-cols-3 gap-2">
                {photoOptions.slice(0, 9).map((p, i) => (
                  <button key={i} onClick={() => setSelectedPhoto(i)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedPhoto === i ? 'border-green-500 shadow-md' : 'border-transparent hover:border-green-300'}`}>
                    <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {selectedPhoto === i && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Share options */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Share this review</h3>
            <div className="space-y-2">
              <button onClick={downloadTemplate} disabled={downloading}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
                <Download className="w-4 h-4" />
                Download as PNG
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${'⭐'.repeat(review.rating)}\n"${reviewText}"\n— ${clientName}\n\n📸 ${bizName}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share via WhatsApp
              </a>
              <button onClick={copyShareText}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy review text'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
