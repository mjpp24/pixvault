'use client'

import { useState } from 'react'
import { CheckCircle, Send, Download, Clock, X, Copy, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { InvoiceRow } from '@/types/database'

interface InvoiceActionsProps {
  invoice: InvoiceRow
  photographerId: string
}

export function InvoiceActions({ invoice, photographerId }: InvoiceActionsProps) {
  const supabase = createClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(invoice.balance_due.toString())
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')

  const sendInvoice = async () => {
    setIsSending(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to send invoice')
      } else if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success('Invoice emailed to client!')
      }
      router.refresh()
    } catch {
      toast.error('Failed to send invoice')
    } finally {
      setIsSending(false)
    }
  }

  const copyClientLink = async () => {
    const url = `${window.location.origin}/invoice/${invoice.id}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Invoice link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const markAsPaid = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          amount_paid: invoice.total,
          balance_due: 0,
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      if (error) throw error

      // Record payment
      await supabase.from('payments').insert({
        photographer_id: photographerId,
        invoice_id: invoice.id,
        client_email: '',
        amount: invoice.total,
        currency: invoice.currency,
        payment_method: paymentMethod as any,
        status: 'successful',
        paid_at: new Date().toISOString(),
      })

      toast.success('Invoice marked as paid!')
      router.refresh()
    } catch {
      toast.error('Failed to update invoice')
    } finally {
      setIsLoading(false)
    }
  }

  const recordPartialPayment = async () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setIsLoading(true)
    try {
      const newAmountPaid = invoice.amount_paid + amount
      const newBalance = invoice.total - newAmountPaid
      const newStatus = newBalance <= 0 ? 'paid' as const : invoice.status

      const { error } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: Math.max(0, newBalance),
          status: newStatus,
          paid_at: newBalance <= 0 ? new Date().toISOString() : null,
        })
        .eq('id', invoice.id)

      if (error) throw error

      await supabase.from('payments').insert({
        photographer_id: photographerId,
        invoice_id: invoice.id,
        client_email: '',
        amount,
        currency: invoice.currency,
        payment_method: paymentMethod as any,
        status: 'successful',
        paid_at: new Date().toISOString(),
      })

      toast.success('Payment recorded!')
      setShowPaymentModal(false)
      router.refresh()
    } catch {
      toast.error('Failed to record payment')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadPdf = async () => {
    const res = await fetch(`/api/invoices/${invoice.id}/pdf`)
    if (!res.ok) { toast.error('Failed to generate PDF'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.invoice_number}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
      <h3 className="font-semibold text-gray-900 text-sm">Actions</h3>

      {/* Send + Copy row — always visible when not cancelled */}
      {invoice.status !== 'cancelled' && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={sendInvoice} disabled={isSending}>
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {invoice.status === 'sent' || invoice.status === 'paid' ? 'Resend' : 'Send to Client'}
          </Button>
          <button
            onClick={copyClientLink}
            title="Copy client link"
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 transition-colors flex-shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
        <>
          <Button className="w-full" variant="outline" onClick={downloadPdf}>
            <Download className="w-4 h-4" />
            Download PDF
          </Button>

          <Button className="w-full" onClick={markAsPaid} loading={isLoading}>
            <CheckCircle className="w-4 h-4" />
            Mark as Fully Paid
          </Button>

          <Button className="w-full" variant="outline" onClick={() => setShowPaymentModal(true)}>
            <Clock className="w-4 h-4" />
            Record Partial Payment
          </Button>
        </>
      )}

      {invoice.status === 'paid' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Paid {invoice.paid_at ? `on ${formatDate(invoice.paid_at)}` : ''}
          </div>
          <Button className="w-full" variant="outline" onClick={downloadPdf}>
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      )}

      {/* Partial payment modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Amount ({invoice.currency})</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="paystack">Paystack</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button className="flex-1" loading={isLoading} onClick={recordPartialPayment}>Record Payment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
