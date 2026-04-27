import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const insertSchema = z.object({
  photographer_id: z.string().uuid(),
  gallery_id:      z.string().uuid(),
  client_name:     z.string().optional().nullable(),
  client_email:    z.string().email().optional().nullable(),
  rating:          z.number().int().min(1).max(5),
  review_text:     z.string().max(1000).optional().nullable(),
})

// Public POST — called from the client gallery (unauthenticated)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = insertSchema.parse(body)
    const supabase = await createClient()

    // Verify the gallery exists and belongs to the photographer
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, photographer_id')
      .eq('id', data.gallery_id)
      .eq('photographer_id', data.photographer_id)
      .single()

    if (!gallery) return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })

    const { error } = await (supabase.from('reviews' as any) as any).insert({
      photographer_id: data.photographer_id,
      gallery_id:      data.gallery_id,
      client_name:     data.client_name ?? null,
      client_email:    data.client_email ?? null,
      rating:          data.rating,
      review_text:     data.review_text ?? null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get the inserted review id
    const { data: inserted } = await (supabase.from('reviews' as any) as any)
      .select('id')
      .eq('photographer_id', data.photographer_id)
      .eq('gallery_id', data.gallery_id)
      .eq('client_email', data.client_email ?? '')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Fire a notification to the photographer (includes review_id in metadata)
    const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating)
    await (supabase.from('notifications' as any) as any).insert({
      photographer_id: data.photographer_id,
      gallery_id:      data.gallery_id,
      type:            'review',
      client_name:     data.client_name ?? null,
      client_email:    data.client_email ?? null,
      message:         `${stars}${data.review_text ? ' — ' + data.review_text : ''}`,
      metadata:        inserted ? { review_id: inserted.id, rating: data.rating } : { rating: data.rating },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Authenticated GET — for the photographer dashboard
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await (supabase.from('reviews' as any) as any)
    .select('*, galleries(title, slug)')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ reviews: data ?? [] })
}
