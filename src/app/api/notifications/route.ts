import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
const insertSchema = z.object({
  photographer_id: z.string().uuid(),
  gallery_id:      z.string().uuid(),
  type:            z.enum(['download', 'selection', 'payment', 'review']),
  client_name:     z.string().optional().nullable(),
  client_email:    z.string().email().optional().nullable(),
  message:         z.string().optional().nullable(),
  metadata:        z.record(z.string(), z.unknown()).optional().nullable(),
})

// Public POST — called from the client gallery (unauthenticated)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = insertSchema.parse(body)
    const supabase = await createClient()

    // Verify gallery belongs to the photographer
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, photographer_id')
      .eq('id', data.gallery_id)
      .eq('photographer_id', data.photographer_id)
      .single()

    if (!gallery) return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })

    const insert = {
      photographer_id: data.photographer_id,
      gallery_id:      data.gallery_id,
      type:            data.type,
      client_name:     data.client_name ?? null,
      client_email:    data.client_email ?? null,
      message:         data.message ?? null,
      metadata:        data.metadata ?? null,
    }

    // Use any cast because generated types may lag behind migration
    const { error } = await (supabase.from('notifications' as any) as any).insert(insert)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

  const { data } = await (supabase.from('notifications' as any) as any)
    .select('*, galleries(title, slug, cover_photo_url)')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ notifications: data ?? [] })
}
