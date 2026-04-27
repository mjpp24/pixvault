import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { InvoicePreview } from '@/components/invoice/invoice-preview'
import { PayNowButton } from '@/components/invoice/pay-now-button'
import { Download, Lock, Unlock } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: invoice } = await supabase.from('invoices').select('invoice_number, title').eq('id', id).single()
  if (!invoice) return { title: 'Invoice Not Found' }
  return { title: `${invoice.invoice_number} — ${invoice.title}` }
}

export default async function PublicInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*), invoice_items(*)')
    .eq('id', id)
    .single()

  if (!invoice) notFound()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('*')
    .eq('id', invoice.photographer_id)
    .single()

  if (!photographer) notFound()

  // Check linked gallery status
  let galleryLocked = false
  let gallerySlug = ''
  if (invoice.gallery_id) {
    const { data: gallery } = await supabase
      .from('galleries')
      .select('is_locked, slug')
      .eq('id', invoice.gallery_id)
      .single()
    galleryLocked = gallery?.is_locked ?? false
    gallerySlug = gallery?.slug ?? ''
  }

  const items = ((invoice as any).invoice_items ?? []).sort((a: any, b: any) => a.display_order - b.display_order)

  const discountAmount = invoice.discount_type === 'percentage'
    ? (invoice.subtotal * invoice.discount_value) / 100
    : invoice.discount_type === 'fixed' ? invoice.discount_value : 0

  const previewData = {
    title: invoice.title,
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date ?? '',
    currency: invoice.currency,
    client_name: (invoice as any).clients?.name ?? '',
    client_email: (invoice as any).clients?.email ?? '',
    items,
    discount_type: invoice.discount_type,
    discount_value: invoice.discount_value,
    tax_rate: invoice.tax_rate,
    amount_paid: invoice.amount_paid,
    notes: invoice.notes ?? '',
    terms: invoice.terms ?? '',
    footer_message: invoice.footer_message ?? '',
  }

  const brandColor = photographer.brand_color ?? '#6366f1'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {photographer.logo_url ? (
              <img src={photographer.logo_url} alt="" className="h-8 object-contain" />
            ) : (
              <span className="font-bold text-gray-900">
                {photographer.business_name ?? photographer.full_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={invoice.status as any}>{invoice.status}</Badge>
            <a
              href={`/api/invoices/${id}/pdf`}
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Gallery access status */}
        {invoice.gallery_id && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            galleryLocked
              ? 'bg-amber-50 border-amber-200'
              : 'bg-green-50 border-green-200'
          }`}>
            {galleryLocked ? (
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            ) : (
              <Unlock className="w-5 h-5 text-green-600 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${galleryLocked ? 'text-amber-800' : 'text-green-800'}`}>
                {galleryLocked
                  ? 'Gallery is locked — pay this invoice to unlock access to your photos'
                  : 'Gallery is unlocked — you can now access your photos'}
              </p>
            </div>
            {!galleryLocked && gallerySlug && (
              <Link
                href={`/g/${gallerySlug}`}
                className="ml-auto text-sm text-green-700 font-medium hover:underline flex-shrink-0"
              >
                View Gallery →
              </Link>
            )}
          </div>
        )}

        {/* Payment button (if outstanding balance and Paystack configured) */}
        {invoice.balance_due > 0 && photographer.paystack_public_key && invoice.status !== 'paid' && (
          <PayNowButton
            invoiceId={id}
            balanceDue={invoice.balance_due}
            currency={invoice.currency}
            brandColor={brandColor}
            formattedAmount={formatCurrency(invoice.balance_due, invoice.currency)}
          />
        )}

        {/* Invoice preview */}
        <InvoicePreview
          data={previewData}
          photographer={photographer}
          subtotal={invoice.subtotal}
          discountAmount={discountAmount}
          taxAmount={invoice.tax_amount}
          total={invoice.total}
          balanceDue={invoice.balance_due}
        />
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-gray-400 text-xs">
        Powered by{' '}
        <Link href="/" className="hover:text-gray-600">PixVault</Link>
      </div>
    </div>
  )
}
