import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ReviewShowcase } from './review-showcase'

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Fetch the review (owned by this photographer)
  const { data: review } = await (supabase.from('reviews' as any) as any)
    .select('*, galleries(id, title, slug, cover_photo_url)')
    .eq('id', id)
    .eq('photographer_id', user.id)
    .single() as { data: any }

  if (!review) notFound()

  // Fetch photographer profile
  const { data: photographer } = await supabase
    .from('photographers')
    .select('full_name, business_name, logo_url, brand_color')
    .eq('id', user.id)
    .single()

  // Fetch gallery media for photo selection
  const { data: media } = await supabase
    .from('gallery_media')
    .select('id, file_url, thumbnail_url, file_name, file_type')
    .eq('gallery_id', review.gallery_id)
    .eq('file_type', 'photo')
    .order('display_order', { ascending: true })
    .limit(20)

  return (
    <ReviewShowcase
      review={review}
      photographer={photographer!}
      media={media ?? []}
    />
  )
}
