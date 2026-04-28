import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit2, Send, Download, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoicePreview } from '@/components/invoice/invoice-preview'
import { InvoiceActions } from '@/components/invoice/invoice-actions'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: 'Invoice' }
}

export default async function InvoiceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ send?: string }> }) {
  const { id } = await params
  const { send } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: invoice }, { data: photographer }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients(*), invoice_items(*)')
      .eq('id', id)
      .eq('photographer_id', user.id)
      .single(),
    supabase.from('photographers').select('*').eq('id', user.id).single(),
  ])

  if (!invoice || !photographer) notFound()

  // Auto-mark overdue
  const today = new Date().toISOString().split('T')[0]
  if (invoice.due_date && invoice.due_date < today && ['sent', 'draft'].includes(invoice.status) && invoice.balance_due > 0) {
    await supabase.from('invoices').update({ status: 'overdue' }).eq('id', id)
    ;(invoice as any).status = 'overdue'
  }

  const items = (invoice as any).invoice_items ?? []

  // Build preview data
  const previewData = {
    title: invoice.title,
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date ?? '',
    currency: invoice.currency,
    client_name: (invoice as any).clients?.name ?? '',
    client_email: (invoice as any).clients?.email ?? '',
    items: items.sort((a: any, b: any) => a.display_order - b.display_order),
    discount_type: invoice.discount_type,
    discount_value: invoice.discount_value,
    tax_rate: invoice.tax_rate,
    amount_paid: invoice.amount_paid,
    notes: invoice.notes ?? '',
    terms: invoice.terms ?? '',
    footer_message: invoice.footer_message ?? '',
  }

  const discountAmount = invoice.discount_type === 'percentage'
    ? (invoice.subtotal * invoice.discount_value) / 100
    : invoice.discount_type === 'fixed' ? invoice.discount_value : 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to invoices
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <Badge variant={invoice.status as any}>{invoice.status}</Badge>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {invoice.title} · {(invoice as any).clients?.name ?? 'No client'} · {formatDate(invoice.issue_date)}
          </p>
        </div>
        <Link
          href={`/invoices/${id}/edit`}
          className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice preview */}
        <div className="lg:col-span-2">
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

        {/* Actions sidebar */}
        <div className="space-y-4">
          {/* Amount summary */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">Summary</h3>
            {[
              { label: 'Total', value: formatCurrency(invoice.total, invoice.currency), bold: true },
              { label: 'Amount Paid', value: formatCurrency(invoice.amount_paid, invoice.currency) },
              { label: 'Balance Due', value: formatCurrency(invoice.balance_due, invoice.currency), highlight: invoice.balance_due > 0 },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-400">{row.label}</span>
                <span className={`font-semibold ${row.highlight ? 'text-amber-600' : row.bold ? 'text-gray-900' : 'text-gray-700'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <InvoiceActions invoice={invoice as any} photographerId={user.id} autoOpenSend={send === '1'} />

          {/* Public link */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-2">Client View Link</h3>
            <p className="text-xs text-gray-400 mb-3">Share this link with your client to view and pay the invoice.</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-500 truncate flex-1">
                {process.env.NEXT_PUBLIC_APP_URL}/invoice/{id}
              </span>
            </div>
            <Link
              href={`/invoice/${id}`}
              target="_blank"
              className="mt-2 text-xs text-green-600 hover:underline"
            >
              Open client view →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
