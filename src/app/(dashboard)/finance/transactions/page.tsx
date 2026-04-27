import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { TransactionHistory } from '@/components/finance/transaction-history'

export const metadata = { title: 'Transaction History' }

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const initialType = type === 'income' ? 'income' : type === 'expense' ? 'expense' : ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: transactions }, { data: photographer }] = await Promise.all([
    supabase
      .from('finance_transactions')
      .select('*')
      .eq('photographer_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('photographers').select('currency').eq('id', user.id).single(),
  ])

  const heading = initialType === 'income' ? 'Income' : initialType === 'expense' ? 'Expenses' : 'Transaction History'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/finance" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-1">
            <ArrowLeft className="w-4 h-4" />
            Finance
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{transactions?.length ?? 0} transactions total</p>
        </div>
        <Link
          href="/finance/new"
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add
        </Link>
      </div>

      <TransactionHistory
        transactions={(transactions ?? []) as any}
        currency={photographer?.currency ?? 'NGN'}
        initialType={initialType as '' | 'income' | 'expense'}
      />
    </div>
  )
}
