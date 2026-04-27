'use client'

import { useState } from 'react'
import { Upload, Shield, Share2, ChevronRight, Check, Copy, ExternalLink, Lock, Unlock, RefreshCw, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { GalleryRow } from '@/types/database'
import { GalleryUploader } from './gallery-uploader'
import { GalleryMediaGrid } from './gallery-media-grid'

interface GalleryWorkflowProps {
  gallery: GalleryRow & { clients?: { name: string; email: string } | null }
  media: any[]
  photographerId: string
}

const STEPS = [
  { id: 1, label: 'Upload', icon: Upload, desc: 'Add photos & videos' },
  { id: 2, label: 'Protect', icon: Shield, desc: 'Set payment & access' },
  { id: 3, label: 'Share', icon: Share2, desc: 'Send link to client' },
]

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR']

export function GalleryWorkflow({ gallery: initialGallery, media, photographerId }: GalleryWorkflowProps) {
  const [step, setStep] = useState(1)
  const [gallery, setGallery] = useState(initialGallery)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Protect step state
  const [lockAmount, setLockAmount] = useState(gallery.lock_amount?.toString() ?? '')
  const [lockCurrency, setLockCurrency] = useState(gallery.lock_currency ?? 'NGN')
  const [lockMessage, setLockMessage] = useState(gallery.lock_message ?? 'Please complete your payment to access your gallery.')
  const [previewBeforePayment, setPreviewBeforePayment] = useState(!gallery.is_locked)
  const [watermarkEnabled, setWatermarkEnabled] = useState(!gallery.allow_download)

  const supabase = createClient()
  const router = useRouter()

  const galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL}/g/${gallery.slug}`

  const saveProtectSettings = async () => {
    setIsSaving(true)
    try {
      const updates: Partial<GalleryRow> = {
        allow_download: !watermarkEnabled,
        lock_amount: lockAmount ? parseFloat(lockAmount) : null,
        lock_currency: lockCurrency,
        lock_message: lockMessage,
        is_locked: !previewBeforePayment && !!lockAmount,
        status: 'published',
      }

      const { error } = await supabase.from('galleries').update(updates).eq('id', gallery.id)
      if (error) throw error

      setGallery((prev) => ({ ...prev, ...updates }))
      toast.success('Protection settings saved!')
      setStep(3)
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const approvePayment = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase.from('galleries').update({
        is_locked: false,
        allow_download: true,
      }).eq('id', gallery.id)

      if (error) throw error
      setGallery((prev) => ({ ...prev, is_locked: false, allow_download: true }))
      toast.success('Payment approved! Gallery unlocked for download.')
      router.refresh()
    } catch {
      toast.error('Failed to approve payment')
    } finally {
      setIsSaving(false)
    }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(galleryUrl)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <button
                onClick={() => setStep(s.id)}
                className="flex items-center gap-2.5 group"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  step > s.id
                    ? 'bg-green-500'
                    : step === s.id
                    ? 'bg-green-600'
                    : 'bg-gray-100'
                }`}>
                  {step > s.id
                    ? <Check className="w-4 h-4 text-white" />
                    : <s.icon className={`w-4 h-4 ${step === s.id ? 'text-white' : 'text-gray-400'}`} />
                  }
                </div>
                <div className="hidden sm:block text-left">
                  <p className={`text-xs font-semibold ${step >= s.id ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</p>
                  <p className="text-[10px] text-gray-400">{s.desc}</p>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── STEP 1: UPLOAD ── */}
      {step === 1 && (
        <div className="space-y-6">
          <GalleryUploader galleryId={gallery.id} photographerId={photographerId} />

          {media.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">
                  Photos & Videos
                  <span className="text-gray-400 font-normal ml-2 text-sm">({media.length})</span>
                </h2>
              </div>
              <GalleryMediaGrid media={media} galleryId={gallery.id} coverPhotoUrl={gallery.cover_photo_url} />
            </div>
          )}

          {media.length > 0 && (
            <button
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              Next: Set Protection & Payment
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ── STEP 2: PROTECT ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Gallery Protection</h2>
              <p className="text-sm text-gray-400 mt-0.5">Control how clients access and download their photos</p>
            </div>

            {/* Preview before payment */}
            <div
              onClick={() => setPreviewBeforePayment(!previewBeforePayment)}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                previewBeforePayment ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
                previewBeforePayment ? 'bg-green-600 border-green-600' : 'border-gray-300'
              }`}>
                {previewBeforePayment && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Allow client to preview photos before paying</p>
                <p className="text-xs text-gray-500 mt-0.5">Client can view all photos but cannot download until you approve payment</p>
              </div>
            </div>

            {/* Watermark protection */}
            <div
              onClick={() => setWatermarkEnabled(!watermarkEnabled)}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                watermarkEnabled ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
                watermarkEnabled ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
              }`}>
                {watermarkEnabled && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Add watermark protection to previews</p>
                <p className="text-xs text-gray-500 mt-0.5">Photos will show a "PREVIEW" watermark overlay. Removed after payment approval</p>
              </div>
            </div>

            {/* Payment amount */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Payment Amount</label>
              <p className="text-xs text-gray-400">Set the amount client must pay to unlock downloads</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={lockAmount}
                  onChange={(e) => setLockAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-gray-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  value={lockCurrency}
                  onChange={(e) => setLockCurrency(e.target.value)}
                  className="h-11 rounded-lg border border-gray-200 bg-white text-gray-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Custom lock message */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Message to Client</label>
              <textarea
                value={lockMessage}
                onChange={(e) => setLockMessage(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="Instructions for the client..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={saveProtectSettings}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {isSaving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <>Save & Get Share Link <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: SHARE ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Status banner */}
          <div className={`rounded-xl p-4 flex items-start gap-3 ${
            gallery.is_locked ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              gallery.is_locked ? 'bg-amber-100' : 'bg-green-100'
            }`}>
              {gallery.is_locked
                ? <Lock className="w-4 h-4 text-amber-600" />
                : <Check className="w-4 h-4 text-green-600" />
              }
            </div>
            <div>
              <p className={`text-sm font-semibold ${gallery.is_locked ? 'text-amber-800' : 'text-green-800'}`}>
                {gallery.is_locked ? 'Gallery locked — awaiting payment' : 'Gallery ready for download'}
              </p>
              <p className={`text-xs mt-0.5 ${gallery.is_locked ? 'text-amber-600' : 'text-green-600'}`}>
                {gallery.is_locked
                  ? `Client must pay ${gallery.lock_currency} ${gallery.lock_amount?.toLocaleString()} before downloading`
                  : 'Client can view and download all photos'
                }
              </p>
            </div>
          </div>

          {/* Share link */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Client Gallery Link</h2>
            <p className="text-sm text-gray-500">Share this link with your client. They can view their photos and you control when downloads unlock.</p>

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="flex-1 text-sm text-gray-700 truncate font-mono">{galleryUrl}</span>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors flex-shrink-0"
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
              </button>
              <a
                href={galleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* WhatsApp share */}
            <a
              href={`https://wa.me/?text=Your gallery is ready! View your photos here: ${encodeURIComponent(galleryUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Send via WhatsApp
            </a>
          </div>

          {/* Approve payment */}
          {(gallery.is_locked || !gallery.allow_download) && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
              <h3 className="font-semibold text-gray-900">Approve Payment</h3>
              <p className="text-sm text-gray-500">
                Once your client pays, click below to approve and unlock the gallery for download. The watermark will be removed automatically.
              </p>
              <button
                onClick={approvePayment}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {isSaving
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                  : <><Unlock className="w-4 h-4" /> Approve Payment & Unlock Downloads</>
                }
              </button>
            </div>
          )}

          {/* View selections shortcut */}
          <Link
            href={`/galleries/${gallery.id}/selections`}
            className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
            View Client Selections
          </Link>

          <button
            onClick={() => setStep(1)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors w-full text-center"
          >
            ← Back to upload more photos
          </button>
        </div>
      )}
    </div>
  )
}
