import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ReviewForm } from './review-form'

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, title, photographer_id, cover_photo_url, photographers(full_name, business_name, logo_url, brand_color)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!gallery) notFound()

  const photographer = (gallery as any).photographers as {
    full_name: string
    business_name: string | null
    logo_url: string | null
    brand_color: string
  }

  return (
    <ReviewForm
      galleryId={gallery.id}
      galleryTitle={gallery.title}
      coverUrl={gallery.cover_photo_url}
      photographerId={gallery.photographer_id}
      photographer={photographer}
    />
  )
}
