import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { GalleryDetailClient } from '@/components/gallery/gallery-detail-client'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: gallery } = await supabase.from('galleries').select('title').eq('id', id).single()
  return { title: gallery?.title ?? 'Gallery' }
}

export default async function GalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: gallery } = await supabase
    .from('galleries')
    .select('*, clients(name, email)')
    .eq('id', id)
    .eq('photographer_id', user.id)
    .single()

  if (!gallery) notFound()

  const { data: media } = await supabase
    .from('gallery_media')
    .select('*')
    .eq('gallery_id', id)
    .order('display_order', { ascending: true })

  return (
    <GalleryDetailClient
      gallery={gallery as any}
      initialMedia={media ?? []}
      photographerId={user.id}
    />
  )
}
