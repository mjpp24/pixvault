import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature')

  // We need the photographer's secret key to verify — but the webhook event
  // contains the reference, so we look up the payment first then verify.
  // For a multi-tenant app, we verify using the secret key of the photographer
  // associated with the invoice. However, for Paystack, a single dashboard
  // sends webhooks for all transactions — so we try all secret keys or
  // we trust the payload and verify reference in our DB.
  //
  // Practical approach: parse payload first, look up the invoice photographer,
  // then verify signature with their secret key.

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.event !== 'charge.success') {
    // Acknowledge other events without processing
    return NextResponse.json({ received: true })
  }

  const reference = payload.data?.reference
  if (!reference) {
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
  }

  const supabase = await createClient()

  // Find the payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_reference', reference)
    .single()

  if (!payment) {
    // Not our payment — ignore
    return NextResponse.json({ received: true })
  }

  // Verify webhook signature using photographer's secret key
  if (signature) {
    const { data: photographer } = await supabase
      .from('photographers')
      .select('paystack_secret_key')
      .eq('id', payment.photographer_id)
      .single()

    if (photographer?.paystack_secret_key) {
      const expectedSig = createHmac('sha512', photographer.paystack_secret_key)
        .update(rawBody)
        .digest('hex')
      if (expectedSig !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
  }

  // Mark payment as successful
  await supabase.from('payments').update({
    status: 'successful',
    paid_at: new Date().toISOString(),
    metadata: payload.data,
  }).eq('transaction_reference', reference)

  // Mark invoice as paid
  if (payment.invoice_id) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total')
      .eq('id', payment.invoice_id)
      .single()

    if (invoice) {
      await supabase.from('invoices').update({
        status: 'paid',
        amount_paid: invoice.total,
        balance_due: 0,
        paid_at: new Date().toISOString(),
      }).eq('id', payment.invoice_id)
    }
  }

  // Unlock gallery if linked
  if (payment.gallery_id) {
    await supabase.from('galleries').update({
      is_locked: false,
    }).eq('id', payment.gallery_id)
  }

  return NextResponse.json({ received: true })
}
