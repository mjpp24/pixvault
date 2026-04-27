import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GalleriesClient } from '@/components/gallery/galleries-client'

export const metadata = { title: 'Galleries' }

export default async function GalleriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: galleries } = await supabase
    .from('galleries')
    .select('*, clients(name)')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch preview photos for collage thumbnails
  const galleryIds = galleries?.map((g) => g.id) ?? []
  const { data: previewMedia } = galleryIds.length > 0
    ? await supabase
        .from('gallery_media')
        .select('gallery_id, file_url, thumbnail_url')
        .in('gallery_id', galleryIds)
        .eq('file_type', 'photo')
        .order('display_order', { ascending: true })
    : { data: [] }

  const previewsByGallery: Record<string, string[]> = {}
  for (const m of previewMedia ?? []) {
    if (!previewsByGallery[m.gallery_id]) previewsByGallery[m.gallery_id] = []
    if (previewsByGallery[m.gallery_id].length < 4) {
      // Prefer thumbnail (smaller, browser-renderable) over raw file_url
      const path = m.thumbnail_url ?? m.file_url
      const { data: { publicUrl } } = supabase.storage.from('gallery-media').getPublicUrl(path)
      previewsByGallery[m.gallery_id].push(publicUrl)
    }
  }

  return (
    <GalleriesClient
      galleries={galleries ?? []}
      previewsByGallery={previewsByGallery}
    />
  )
}
