import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TransactionForm } from '@/components/finance/transaction-form'

export const metadata = { title: 'Add Transaction' }

export default async function NewTransactionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographers')
    .select('currency')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Link href="/finance" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Finance
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Transaction</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <TransactionForm
          photographerId={user.id}
          currency={photographer?.currency ?? 'NGN'}
        />
      </div>
    </div>
  )
}
