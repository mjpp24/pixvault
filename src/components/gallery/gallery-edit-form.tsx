'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GalleryRow, ClientRow } from '@/types/database'

const schema = z.object({
  title: z.string().min(2),
  client_id: z.string().optional(),
  description: z.string().optional(),
  event_date: z.string().optional(),
  allow_download: z.boolean(),
  allow_selection: z.boolean(),
  max_selections: z.number().optional(),
  is_password_protected: z.boolean(),
  gallery_password: z.string().optional(),
  expires_at: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  is_locked: z.boolean(),
  lock_message: z.string().optional(),
  lock_amount: z.number().optional(),
})

type FormData = z.infer<typeof schema>

export function GalleryEditForm({
  gallery,
  clients,
}: {
  gallery: GalleryRow
  clients: Pick<ClientRow, 'id' | 'name' | 'email'>[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: gallery.title,
      client_id: gallery.client_id ?? '',
      description: gallery.description ?? '',
      event_date: gallery.event_date ?? '',
      allow_download: gallery.allow_download,
      allow_selection: gallery.allow_selection,
      max_selections: gallery.max_selections ?? undefined,
      is_password_protected: gallery.is_password_protected,
      gallery_password: gallery.gallery_password ?? '',
      expires_at: gallery.expires_at ? gallery.expires_at.split('T')[0] : '',
      status: gallery.status,
      is_locked: gallery.is_locked,
      lock_message: gallery.lock_message ?? '',
      lock_amount: gallery.lock_amount ?? undefined,
    },
  })

  const isPasswordProtected = watch('is_password_protected')
  const isLocked = watch('is_locked')

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from('galleries').update({
        title: data.title,
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
        is_locked: data.is_locked,
        lock_message: data.lock_message || null,
        lock_amount: data.lock_amount || null,
      }).eq('id', gallery.id)

      if (error) throw error
      toast.success('Gallery updated!')
      router.push(`/galleries/${gallery.id}`)
    } catch {
      toast.error('Failed to update gallery.')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteGallery = async () => {
    if (!confirm('Delete this gallery and all its photos? This cannot be undone.')) return
    setIsDeleting(true)
    try {
      await supabase.from('galleries').delete().eq('id', gallery.id)
      toast.success('Gallery deleted')
      router.push('/galleries')
    } catch {
      toast.error('Failed to delete gallery')
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href={`/galleries/${gallery.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to gallery
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Gallery</h1>
        </div>
        <button onClick={deleteGallery} disabled={isDeleting} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors">
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input {...register('title')} />
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <select className="flex h-10 w-full rounded-md border border-[var(--input)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" {...register('client_id')}>
              <option value="">No client</option>
              {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-[var(--input)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] resize-none" {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Event Date</Label><Input type="date" {...register('event_date')} /></div>
            <div className="space-y-1.5"><Label>Expires</Label><Input type="date" {...register('expires_at')} /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Settings</h2>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Allow Download</span>
            <input type="checkbox" {...register('allow_download')} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Allow Selection</span>
            <input type="checkbox" {...register('allow_selection')} />
          </label>
          <div className="space-y-1.5">
            <Label>Max Selections</Label>
            <Input type="number" className="w-32" placeholder="No limit" {...register('max_selections')} />
          </div>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Password Protected</span>
            <input type="checkbox" {...register('is_password_protected')} />
          </label>
          {isPasswordProtected && (
            <div className="space-y-1.5"><Label>Password</Label><Input {...register('gallery_password')} /></div>
          )}
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Lock Gallery (Require Payment)</span>
            <input type="checkbox" {...register('is_locked')} />
          </label>
          {isLocked && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Lock Message</Label>
                <Input placeholder="Please complete payment to access your photos..." {...register('lock_message')} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount Due</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register('lock_amount')} />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select className="flex h-10 w-full rounded-md border border-[var(--input)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" {...register('status')}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <Button type="submit" loading={isLoading} className="w-full">Save Changes</Button>
      </form>
    </div>
  )
}
