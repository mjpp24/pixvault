'use client'

import { formatCurrency, formatDate } from '@/lib/utils'
import type { Photographer } from '@/types/database'

interface InvoicePreviewProps {
  data: {
    title?: string
    invoice_number?: string
    issue_date?: string
    due_date?: string
    currency?: string
    client_name?: string
    client_email?: string
    client_address?: string
    items?: { description: string; quantity: number; unit_price: number; total: number }[]
    discount_type?: string
    discount_value?: number
    tax_rate?: number
    amount_paid?: number
    notes?: string
    terms?: string
    footer_message?: string
  }
  photographer: Photographer
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  balanceDue: number
}

export function InvoicePreview({
  data,
  photographer,
  subtotal,
  discountAmount,
  taxAmount,
  total,
  balanceDue,
}: InvoicePreviewProps) {
  const brandColor = photographer.brand_color ?? '#6366f1'
  const currency = data.currency ?? photographer.currency ?? 'NGN'

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden text-[11px] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Top accent bar */}
      <div className="h-1.5" style={{ backgroundColor: brandColor }} />

      <div className="p-7 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            {photographer.logo_url ? (
              <img src={photographer.logo_url} alt="" className="h-10 object-contain mb-2" />
            ) : (
              <p className="text-base font-bold text-gray-900">
                {photographer.business_name ?? photographer.full_name}
              </p>
            )}
            <p className="text-gray-400 text-[10px]">{photographer.email}</p>
            {photographer.phone && <p className="text-gray-400 text-[10px]">{photographer.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold uppercase tracking-widest" style={{ color: brandColor }}>
              INVOICE
            </p>
            <p className="text-gray-600 font-medium mt-0.5">{data.invoice_number || 'INV-001'}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="flex gap-6 text-[10px]">
          <div>
            <p className="text-gray-400 uppercase font-semibold tracking-wide">Issue Date</p>
            <p className="text-gray-800 font-medium">{data.issue_date ? formatDate(data.issue_date) : '—'}</p>
          </div>
          {data.due_date && (
            <div>
              <p className="text-gray-400 uppercase font-semibold tracking-wide">Due Date</p>
              <p className="text-gray-800 font-medium">{formatDate(data.due_date)}</p>
            </div>
          )}
        </div>

        {/* Bill To */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 uppercase font-semibold tracking-wide text-[9px] mb-1">From</p>
            <p className="font-semibold text-gray-900 text-[11px]">
              {photographer.business_name ?? photographer.full_name}
            </p>
            {photographer.bank_name && (
              <p className="text-gray-500 text-[10px] mt-0.5">
                {photographer.bank_name} · {photographer.account_number}
              </p>
            )}
          </div>
          <div>
            <p className="text-gray-400 uppercase font-semibold tracking-wide text-[9px] mb-1">Bill To</p>
            <p className="font-semibold text-gray-900 text-[11px]">{data.client_name || '—'}</p>
            {data.client_email && <p className="text-gray-500 text-[10px]">{data.client_email}</p>}
            {data.client_address && <p className="text-gray-500 text-[10px]">{data.client_address}</p>}
          </div>
        </div>

        {/* Invoice title */}
        {data.title && (
          <div className="pb-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700">{data.title}</p>
          </div>
        )}

        {/* Line items */}
        <div>
          {/* Table header */}
          <div
            className="flex px-2 py-1.5 rounded text-[9px] font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: brandColor }}
          >
            <div className="flex-1 min-w-0">Description</div>
            <div className="w-8 text-center shrink-0">Qty</div>
            <div className="w-20 text-right shrink-0">Rate</div>
            <div className="w-20 text-right shrink-0">Amount</div>
          </div>
          {(data.items ?? []).map((item, i) => (
            <div
              key={i}
              className={`flex px-2 py-2 border-b border-gray-50 gap-1 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}
            >
              <div className="flex-1 min-w-0 text-gray-700 break-words">{item.description || '—'}</div>
              <div className="w-8 text-center text-gray-600 shrink-0">{item.quantity}</div>
              <div className="w-20 text-right text-gray-600 shrink-0 break-all">{formatCurrency(item.unit_price ?? 0, currency)}</div>
              <div className="w-20 text-right font-medium text-gray-900 shrink-0 break-all">
                {formatCurrency((item.quantity ?? 0) * (item.unit_price ?? 0), currency)}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="ml-auto w-48 space-y-1">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount, currency)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Tax ({data.tax_rate}%)</span>
              <span>+{formatCurrency(taxAmount, currency)}</span>
            </div>
          )}
          <div
            className="flex justify-between font-bold text-xs pt-1 border-t"
            style={{ borderColor: brandColor, color: brandColor }}
          >
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
          {(data.amount_paid ?? 0) > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Amount Paid</span>
              <span>-{formatCurrency(data.amount_paid ?? 0, currency)}</span>
            </div>
          )}
          {balanceDue > 0 && (
            <div className="flex justify-between font-semibold text-amber-600 text-xs">
              <span>Balance Due</span>
              <span>{formatCurrency(balanceDue, currency)}</span>
            </div>
          )}
        </div>

        {/* Payment instructions */}
        {photographer.bank_name && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-semibold text-[10px] text-gray-700 mb-1">Payment Instructions</p>
            <p className="text-gray-500 text-[10px]">
              Bank: {photographer.bank_name} · Account: {photographer.account_number} · Name: {photographer.account_name}
            </p>
          </div>
        )}

        {/* Notes & Terms */}
        {data.notes && (
          <div>
            <p className="font-semibold text-[10px] text-gray-700 mb-0.5">Notes</p>
            <p className="text-gray-500 text-[10px]">{data.notes}</p>
          </div>
        )}
        {data.terms && (
          <div>
            <p className="font-semibold text-[10px] text-gray-700 mb-0.5">Terms</p>
            <p className="text-gray-500 text-[10px]">{data.terms}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-3 border-t border-gray-100">
          <p className="text-gray-400 text-[9px]">{data.footer_message ?? 'Thank you for your business!'}</p>
          <p className="text-gray-300 text-[9px] mt-1">Powered by PixVault</p>
        </div>
      </div>
    </div>
  )
}
