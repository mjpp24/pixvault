import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Require authenticated photographer
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*)')
    .eq('id', id)
    .eq('photographer_id', user.id)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const client = (invoice as any).clients
  if (!client?.email) {
    return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })
  }

  const { data: photographer } = await supabase
    .from('photographers')
    .select('full_name, business_name, brand_color, email')
    .eq('id', user.id)
    .single()

  const photographerName = photographer?.business_name ?? photographer?.full_name ?? 'Your Photographer'
  const brandColor = photographer?.brand_color ?? '#6366f1'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const invoiceUrl = `${appUrl}/invoice/${id}`
  const pdfUrl = `${appUrl}/api/invoices/${id}/pdf`

  if (!process.env.RESEND_API_KEY) {
    // Resend not configured — mark invoice as sent anyway
    await supabase.from('invoices').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    }).eq('id', id)

    return NextResponse.json({
      warning: 'Email not sent — RESEND_API_KEY not configured. Invoice marked as sent.',
    })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? `${photographerName} <invoices@pixvault.app>`,
    to: client.email,
    subject: `Invoice ${invoice.invoice_number} from ${photographerName}`,
    html: buildInvoiceEmail({
      photographerName,
      brandColor,
      clientName: client.name,
      invoiceNumber: invoice.invoice_number,
      invoiceTitle: invoice.title,
      total: invoice.total,
      balanceDue: invoice.balance_due,
      currency: invoice.currency,
      dueDate: invoice.due_date,
      invoiceUrl,
      pdfUrl,
    }),
  })

  if (emailError) {
    console.error('Resend error:', emailError)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
  }

  // Mark invoice as sent
  await supabase.from('invoices').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ success: true })
}

function buildInvoiceEmail(opts: {
  photographerName: string
  brandColor: string
  clientName: string
  invoiceNumber: string
  invoiceTitle: string
  total: number
  balanceDue: number
  currency: string
  dueDate: string | null
  invoiceUrl: string
  pdfUrl: string
}) {
  const {
    photographerName, brandColor, clientName, invoiceNumber, invoiceTitle,
    total, balanceDue, currency, dueDate, invoiceUrl, pdfUrl,
  } = opts

  const formattedTotal = new Intl.NumberFormat('en', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(total)

  const formattedBalance = new Intl.NumberFormat('en', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(balanceDue)

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <!-- Brand bar -->
    <div style="height:6px;background:${brandColor};"></div>

    <!-- Header -->
    <div style="padding:32px 32px 0;">
      <p style="margin:0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${photographerName}</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#111827;">Invoice ${invoiceNumber}</h1>
    </div>

    <!-- Body -->
    <div style="padding:24px 32px;">
      <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${clientName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        Please find your invoice for <strong>${invoiceTitle}</strong> attached below.
        ${balanceDue > 0 ? `The balance due is <strong>${formattedBalance}</strong>.` : 'This invoice has been paid in full.'}
        ${dueDate ? `Payment is due by <strong>${new Date(dueDate).toLocaleDateString('en', { dateStyle: 'medium' })}</strong>.` : ''}
      </p>

      <!-- Amount box -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:13px;color:#6b7280;">Total</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${formattedTotal}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:#6b7280;">Balance Due</span>
          <span style="font-size:15px;font-weight:700;color:${brandColor};">${formattedBalance}</span>
        </div>
      </div>

      <!-- CTAs -->
      <a href="${invoiceUrl}" style="display:block;text-align:center;background:${brandColor};color:#fff;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;margin-bottom:12px;">
        View &amp; Pay Invoice
      </a>
      <a href="${pdfUrl}" style="display:block;text-align:center;background:#f3f4f6;color:#374151;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500;text-decoration:none;">
        Download PDF
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Sent by ${photographerName} via <a href="${process.env.NEXT_PUBLIC_APP_URL ?? '#'}" style="color:#6b7280;text-decoration:none;">PixVault</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}
