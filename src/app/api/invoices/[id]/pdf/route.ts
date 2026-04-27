import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePdfDocument } from '@/components/invoice/invoice-pdf'
import React from 'react'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Allow both authenticated (photographer) and public access (client via token)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*), invoice_items(*)')
    .eq('id', id)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // Only allow photographer or public invoice page to generate PDF
  if (user && invoice.photographer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: photographer } = await supabase
    .from('photographers')
    .select('*')
    .eq('id', invoice.photographer_id)
    .single()

  if (!photographer) {
    return NextResponse.json({ error: 'Photographer not found' }, { status: 404 })
  }

  try {
    const element = React.createElement(InvoicePdfDocument, {
      invoice: invoice as any,
      photographer,
      items: (invoice as any).invoice_items ?? [],
      client: (invoice as any).clients ?? null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
