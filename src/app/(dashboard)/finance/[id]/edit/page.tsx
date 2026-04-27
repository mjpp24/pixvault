import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TransactionForm } from '@/components/finance/transaction-form'

export const metadata = { title: 'Edit Transaction' }

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: transaction }, { data: photographer }] = await Promise.all([
    supabase
      .from('finance_transactions')
      .select('*')
      .eq('id', id)
      .eq('photographer_id', user.id)
      .single(),
    supabase
      .from('photographers')
      .select('currency')
      .eq('id', user.id)
      .single(),
  ])

  if (!transaction) notFound()

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Link href="/finance/transactions" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Transactions
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Transaction</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <TransactionForm
          photographerId={user.id}
          currency={photographer?.currency ?? 'NGN'}
          existing={transaction as any}
        />
      </div>
    </div>
  )
}
