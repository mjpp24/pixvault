import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  selections: z.array(z.object({
    gallery_id: z.string().uuid(),
    media_id: z.string().uuid(),
    client_email: z.string().email(),
    client_name: z.string().optional(),
    comment: z.string().max(500).optional().nullable(),
  })).min(1).max(500),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { selections } = schema.parse(body)

    const supabase = await createClient()

    const galleryId = selections[0].gallery_id
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, allow_selection, max_selections, status')
      .eq('id', galleryId)
      .eq('status', 'published')
      .single()

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
    }

    if (!gallery.allow_selection) {
      return NextResponse.json({ error: 'Photo selection is disabled for this gallery' }, { status: 403 })
    }

    if (gallery.max_selections && selections.length > gallery.max_selections) {
      return NextResponse.json(
        { error: `You can only select up to ${gallery.max_selections} photos` },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('selections')
      .upsert(
        selections.map((s) => ({
          gallery_id: s.gallery_id,
          media_id: s.media_id,
          client_email: s.client_email,
          client_name: s.client_name ?? null,
          comment: s.comment ?? null,
        })),
        { onConflict: 'gallery_id,media_id,client_email', ignoreDuplicates: false }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: selections.length })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const galleryId = req.nextUrl.searchParams.get('gallery_id')
  if (!galleryId) return NextResponse.json({ error: 'gallery_id required' }, { status: 400 })

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id')
    .eq('id', galleryId)
    .eq('photographer_id', user.id)
    .single()

  if (!gallery) return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })

  const { data } = await supabase
    .from('selections')
    .select('*, gallery_media(file_name, thumbnail_url, file_url)')
    .eq('gallery_id', galleryId)
    .order('selected_at', { ascending: false })

  return NextResponse.json({ selections: data ?? [] })
}
