import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json()
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Load invoice + photographer (no auth required — public payment link)
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('id', invoiceId)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.balance_due <= 0) {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 })
    }

    const { data: photographer } = await supabase
      .from('photographers')
      .select('paystack_secret_key, paystack_public_key, full_name, business_name, currency')
      .eq('id', invoice.photographer_id)
      .single()

    if (!photographer?.paystack_secret_key) {
      return NextResponse.json({ error: 'Photographer has not configured Paystack' }, { status: 400 })
    }

    const clientEmail = (invoice as any).clients?.email ?? ''
    if (!clientEmail) {
      return NextResponse.json({ error: 'Client email not found on invoice' }, { status: 400 })
    }

    const reference = `PIX-${invoiceId.slice(0, 8)}-${Date.now()}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
    const callbackUrl = `${appUrl}/payments/callback?reference=${reference}&invoice_id=${invoiceId}`

    // Paystack amounts are in the smallest currency unit (kobo for NGN, pesewas for GHS, etc.)
    // For USD/GBP/EUR multiply by 100. For NGN/KES/GHS/XOF/XAF also multiply by 100.
    const amountInSubunit = Math.round(invoice.balance_due * 100)

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${photographer.paystack_secret_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: clientEmail,
        amount: amountInSubunit,
        currency: invoice.currency,
        reference,
        callback_url: callbackUrl,
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoice.invoice_number,
          photographer_id: invoice.photographer_id,
          gallery_id: invoice.gallery_id ?? null,
          custom_fields: [
            { display_name: 'Invoice', variable_name: 'invoice_number', value: invoice.invoice_number },
          ],
        },
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackData.status) {
      return NextResponse.json({ error: paystackData.message ?? 'Paystack error' }, { status: 502 })
    }

    // Create a pending payment record
    await supabase.from('payments').insert({
      photographer_id: invoice.photographer_id,
      gallery_id: invoice.gallery_id ?? null,
      invoice_id: invoiceId,
      client_email: clientEmail,
      client_name: (invoice as any).clients?.name ?? null,
      amount: invoice.balance_due,
      currency: invoice.currency,
      payment_method: 'paystack',
      transaction_reference: reference,
      status: 'pending',
      metadata: { access_code: paystackData.data.access_code },
    })

    return NextResponse.json({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
      public_key: photographer.paystack_public_key,
    })
  } catch (err) {
    console.error('Paystack init error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
