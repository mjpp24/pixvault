'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, CheckSquare, Package } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateGallerySlug } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  client_id: z.string().optional(),
  description: z.string().optional(),
  event_date: z.string().optional(),
  allow_download: z.boolean(),
  allow_selection: z.boolean(),
  max_selections: z.number().nullable().optional(),
  is_password_protected: z.boolean(),
  gallery_password: z.string().optional(),
  expires_at: z.string().optional(),
  status: z.enum(['draft', 'published']),
})

type FormData = z.infer<typeof schema>
type GalleryType = 'selection' | 'delivery'

export default function NewGalleryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [galleryType, setGalleryType] = useState<GalleryType>('delivery')

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name, email').order('name')
      return data ?? []
    },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      allow_download: true,
      allow_selection: false,
      is_password_protected: false,
      status: 'draft',
    },
  })

  const isPasswordProtected = watch('is_password_protected')

  const pickType = (type: GalleryType) => {
    setGalleryType(type)
    if (type === 'selection') {
      setValue('allow_selection', true)
      setValue('allow_download', false)
    } else {
      setValue('allow_selection', false)
      setValue('allow_download', true)
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const slug = generateGallerySlug(data.title)

      const { data: gallery, error } = await supabase
        .from('galleries')
        .insert({
          photographer_id: user.id,
          title: data.title,
          slug,
          client_id: data.client_id || null,
          description: data.description || null,
          event_date: data.event_date || null,
          allow_download: data.allow_download,
          allow_selection: data.allow_selection,
          max_selections: data.max_selections || null,
          is_password_protected: data.is_password_protected,
          gallery_password: data.is_password_protected ? data.gallery_password : null,
          expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
          status: data.status,
          gallery_type: galleryType,
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to create gallery. Please try again.')
        return
      }

      toast.success('Gallery created!')
      router.push(`/galleries/${gallery.id}`)
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/galleries" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to galleries
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Gallery</h1>
        <p className="text-gray-500 text-sm mt-0.5">Set up your gallery details — you can upload photos after creating it.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Gallery Type picker ── */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Gallery Type</h2>
            <p className="text-xs text-gray-400 mt-0.5">This determines what your client sees when they open the link.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Selection */}
            <button
              type="button"
              onClick={() => pickType('selection')}
              className={`relative flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                galleryType === 'selection'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {galleryType === 'selection' && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Selection Gallery</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Client picks their favourite photos. Photos are watermarked with grid lines until you deliver.</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Watermarked</span>
                <span className="text-[10px] font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Grid lines</span>
                <span className="text-[10px] font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">No download</span>
              </div>
            </button>

            {/* Delivery */}
            <button
              type="button"
              onClick={() => pickType('delivery')}
              className={`relative flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                galleryType === 'delivery'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {galleryType === 'delivery' && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Delivery Gallery</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Final photos delivered to client. Full quality, clean view with download enabled.</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Clean view</span>
                <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Full quality</span>
                <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Downloadable</span>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Gallery Details</h2>

          <div className="space-y-1.5">
            <Label>Gallery Title <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Sarah & James Wedding" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Client</Label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              {...register('client_id')}
            >
              <option value="">Select a client (optional)</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              Don&apos;t see the client?{' '}
              <Link href="/clients/new" className="text-green-600 hover:underline">Add new client</Link>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="A brief description of this gallery..."
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Event Date</Label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                {...register('event_date')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <input
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                {...register('expires_at')}
              />
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Gallery Settings</h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-900">Allow Download</p>
                <p className="text-xs text-gray-400">Clients can download photos</p>
              </div>
              <input type="checkbox" className="toggle" {...register('allow_download')} />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-900">Allow Photo Selection</p>
                <p className="text-xs text-gray-400">Clients can select favourite photos</p>
              </div>
              <input type="checkbox" className="toggle" {...register('allow_selection')} />
            </label>

            <div className="space-y-1.5">
              <Label>Max Photo Selections</Label>
              <input
                type="number"
                min={1}
                placeholder="No limit"
                className="flex h-10 w-40 rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                {...register('max_selections', {
                  setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
                })}
              />
              <p className="text-xs text-gray-400">Leave blank for unlimited selections</p>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-900">Password Protected</p>
                <p className="text-xs text-gray-400">Require a password to view gallery</p>
              </div>
              <input type="checkbox" className="toggle" {...register('is_password_protected')} />
            </label>

            {isPasswordProtected && (
              <div className="space-y-1.5 pl-0">
                <Label>Gallery Password</Label>
                <Input
                  type="text"
                  placeholder="Enter gallery password"
                  className="w-64"
                  {...register('gallery_password')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Publish status */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Publish Status</h2>
          <div className="flex gap-3">
            <label className="flex-1 flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:border-green-200 transition-colors has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
              <input type="radio" value="draft" className="mt-0.5" {...register('status')} />
              <div>
                <p className="text-sm font-medium text-gray-900">Save as Draft</p>
                <p className="text-xs text-gray-400">Only you can see this gallery</p>
              </div>
            </label>
            <label className="flex-1 flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:border-green-200 transition-colors has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
              <input type="radio" value="published" className="mt-0.5" {...register('status')} />
              <div>
                <p className="text-sm font-medium text-gray-900">Publish Now</p>
                <p className="text-xs text-gray-400">Share the link with your client</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/galleries">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" loading={isLoading} className="flex-1">
            {isLoading ? 'Creating...' : 'Create Gallery'}
          </Button>
        </div>
      </form>
    </div>
  )
}
