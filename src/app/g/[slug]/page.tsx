import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ClientGalleryView } from '@/components/gallery/client-gallery-view'
import { Clock } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: gallery } = await supabase
    .from('galleries')
    .select('title, description, cover_photo_url, photographers(full_name, business_name)')
    .eq('slug', slug)
    .single()

  if (!gallery) return { title: 'Gallery Not Found' }

  const photographer = (gallery as any).photographers
  const name = photographer?.business_name ?? photographer?.full_name ?? 'Photographer'

  return {
    title: `${gallery.title} — ${name}`,
    description: gallery.description ?? `View photos from ${gallery.title}`,
    openGraph: {
      title: `${gallery.title} — ${name}`,
      description: gallery.description ?? `View photos from ${gallery.title}`,
      images: gallery.cover_photo_url ? [{ url: gallery.cover_photo_url }] : [],
      type: 'website',
    },
  }
}

export default async function ClientGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: gallery } = await supabase
    .from('galleries')
    .select(`
      *,
      photographers(
        full_name,
        business_name,
        profile_photo_url,
        logo_url,
        brand_color,
        instagram,
        website
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!gallery) notFound()

  // Check expiry
  if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
    const photographer = (gallery as any).photographers
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 text-center">
          {photographer?.logo_url ? (
            <img src={photographer.logo_url} alt="" className="h-12 object-contain mx-auto mb-4" />
          ) : (
            <p className="text-white font-bold text-xl mb-4">
              {photographer?.business_name ?? photographer?.full_name}
            </p>
          )}
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-white text-xl font-bold">{gallery.title}</h2>
          <p className="text-gray-400 text-sm mt-3 leading-relaxed">
            This gallery has expired. Please contact your photographer if you need access.
          </p>
          <p className="text-gray-600 text-xs mt-4">
            Expired on {new Date(gallery.expires_at).toLocaleDateString('en', { dateStyle: 'long' })}
          </p>
        </div>
      </div>
    )
  }

  // Increment view count (fire and forget)
  supabase.rpc('increment_gallery_views', { gallery_slug: slug }).then(() => {})

  // Get media
  const { data: media } = await supabase
    .from('gallery_media')
    .select('*')
    .eq('gallery_id', gallery.id)
    .order('display_order', { ascending: true })

  return (
    <ClientGalleryView
      gallery={gallery as any}
      media={media ?? []}
    />
  )
}
