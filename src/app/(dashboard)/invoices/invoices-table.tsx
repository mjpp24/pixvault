'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Invoice {
  id: string
  invoice_number: string
  title: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string | null
  total: number
  balance_due: number
  currency: string
  clients?: { name: string; email: string } | null
}

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter()

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              onClick={() => router.push(`/invoices/${invoice.id}`)}
              className="hover:bg-green-50/50 transition-colors cursor-pointer"
            >
              <td className="px-5 py-4">
                <p className="font-medium text-green-600 text-sm">{invoice.invoice_number}</p>
                <p className="text-xs text-gray-400 truncate max-w-[180px]">{invoice.title}</p>
              </td>
              <td className="px-5 py-4">
                <p className="text-sm text-gray-900">{invoice.clients?.name ?? '—'}</p>
                <p className="text-xs text-gray-400">{invoice.clients?.email ?? ''}</p>
              </td>
              <td className="px-5 py-4 text-sm text-gray-500">{formatDate(invoice.issue_date)}</td>
              <td className="px-5 py-4 text-sm text-gray-500">
                {invoice.due_date ? formatDate(invoice.due_date) : '—'}
              </td>
              <td className="px-5 py-4">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.total, invoice.currency)}</p>
                {invoice.balance_due > 0 && invoice.status !== 'draft' && (
                  <p className="text-xs text-amber-600">Due: {formatCurrency(invoice.balance_due, invoice.currency)}</p>
                )}
              </td>
              <td className="px-5 py-4">
                <Badge variant={invoice.status}>{invoice.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
