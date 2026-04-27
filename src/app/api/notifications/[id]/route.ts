import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH — mark read OR confirm payment (unlocks gallery + records payment)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body // 'read' | 'confirm_payment'

  // Fetch notification with full details
  const { data: notif } = await (supabase.from('notifications' as any) as any)
    .select('*')
    .eq('id', id)
    .eq('photographer_id', user.id)
    .single() as {
      data: {
        id: string
        gallery_id: string | null
        client_name: string | null
        client_email: string | null
        message: string | null
        type: string
      } | null
    }

  if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'confirm_payment' && notif.gallery_id) {
    // 1. Fetch gallery to get lock_amount and lock_currency
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, lock_amount, lock_currency, title')
      .eq('id', notif.gallery_id)
      .eq('photographer_id', user.id)
      .single()

    // 2. Unlock the gallery for downloads
    await supabase
      .from('galleries')
      .update({ is_locked: false, allow_download: true, gallery_type: 'delivery' })
      .eq('id', notif.gallery_id)
      .eq('photographer_id', user.id)

    // 3. Record the payment so it appears in Payments dashboard
    if (gallery && gallery.lock_amount) {
      await supabase.from('payments').insert({
        photographer_id:      user.id,
        gallery_id:           notif.gallery_id,
        client_email:         notif.client_email ?? 'unknown@client.com',
        client_name:          notif.client_name ?? null,
        amount:               gallery.lock_amount,
        currency:             gallery.lock_currency ?? 'NGN',
        payment_method:       'bank_transfer',
        status:               'successful',
        paid_at:              new Date().toISOString(),
        transaction_reference: `NOTIF-${id}`,
      })
    }
  }

  // Mark notification as read
  await (supabase.from('notifications' as any) as any)
    .update({ is_read: true })
    .eq('id', id)

  return NextResponse.json({ success: true })
}

// DELETE — dismiss notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await (supabase.from('notifications' as any) as any)
    .delete()
    .eq('id', id)
    .eq('photographer_id', user.id)

  return NextResponse.json({ success: true })
}
