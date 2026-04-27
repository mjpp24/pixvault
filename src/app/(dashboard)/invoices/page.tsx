import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { InvoicesTable } from './invoices-table'

export const metadata = { title: 'Invoices' }

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, clients(name, email)')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })

  // Auto-mark overdue invoices (sent/draft + past due date)
  const today = new Date().toISOString().split('T')[0]
  const overdueIds = invoices
    ?.filter((inv) => inv.due_date && inv.due_date < today && ['sent', 'draft'].includes(inv.status) && inv.balance_due > 0)
    .map((inv) => inv.id) ?? []
  if (overdueIds.length > 0) {
    await supabase.from('invoices').update({ status: 'overdue' }).in('id', overdueIds)
    overdueIds.forEach((id) => {
      const inv = invoices?.find((i) => i.id === id)
      if (inv) inv.status = 'overdue'
    })
  }

  // Revenue summary
  const totalInvoiced = invoices?.reduce((sum, inv) => sum + inv.total, 0) ?? 0
  const totalPaid = invoices?.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0) ?? 0
  const totalOutstanding = invoices?.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((sum, inv) => sum + inv.balance_due, 0) ?? 0
  const currency = invoices?.[0]?.currency ?? 'NGN'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-0.5">{invoices?.length ?? 0} invoices total</p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Invoiced', value: formatCurrency(totalInvoiced, currency), color: 'text-gray-900' },
          { label: 'Total Paid', value: formatCurrency(totalPaid, currency), color: 'text-green-600' },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding, currency), color: 'text-amber-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">No invoices yet</h2>
          <p className="text-gray-500 text-sm mt-1 max-w-sm">
            Create professional invoices and send them directly to your clients.
          </p>
          <Link
            href="/invoices/new"
            className="mt-4 inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Invoice
          </Link>
        </div>
      ) : (
        <InvoicesTable invoices={invoices as any} />
      )}
    </div>
  )
}
