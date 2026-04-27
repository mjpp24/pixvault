import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

export const metadata = { title: 'Payments' }

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographers')
    .select('currency')
    .eq('id', user.id)
    .single()

  const { data: payments } = await supabase
    .from('payments')
    .select('*, galleries(title), invoices(invoice_number)')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  const currency = photographer?.currency ?? 'NGN'
  const successful = payments?.filter((p) => p.status === 'successful') ?? []
  const totalRevenue = successful.reduce((sum, p) => sum + p.amount, 0)
  const thisMonth = successful.filter((p) => {
    const d = new Date(p.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Payments</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue, currency), color: 'text-green-600' },
          { label: 'This Month', value: formatCurrency(thisMonth, currency), color: 'text-green-600' },
          { label: 'Total Transactions', value: successful.length.toString(), color: 'text-gray-900' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {!payments || payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">No payments yet</h2>
          <p className="text-gray-500 text-sm mt-1">Payments will appear here once clients pay for galleries or invoices.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">For</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Method</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((payment: any) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{payment.client_name ?? payment.client_email}</p>
                    <p className="text-xs text-gray-400">{payment.client_email}</p>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-sm text-gray-500">
                    {payment.galleries?.title ?? payment.invoices?.invoice_number ?? '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-sm text-gray-500 capitalize">
                    {payment.payment_method?.replace('_', ' ') ?? '—'}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={payment.status === 'successful' ? 'paid' : payment.status === 'pending' ? 'pending' : 'destructive'}>
                      {payment.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">{formatDate(payment.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
