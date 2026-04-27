import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BudgetManager } from '@/components/finance/budget-manager'
import { getCurrentMonthRange } from '@/lib/finance'

export const metadata = { title: 'Budget Manager' }

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { start: monthStart, end: monthEnd } = getCurrentMonthRange()

  const [{ data: budgets }, { data: transactions }, { data: photographer }] = await Promise.all([
    supabase.from('finance_budgets').select('*').eq('photographer_id', user.id),
    supabase
      .from('finance_transactions')
      .select('category, amount')
      .eq('photographer_id', user.id)
      .eq('type', 'expense')
      .gte('date', monthStart)
      .lte('date', monthEnd),
    supabase.from('photographers').select('currency').eq('id', user.id).single(),
  ])

  const spending: Record<string, number> = {}
  transactions?.forEach(t => {
    spending[t.category] = (spending[t.category] ?? 0) + Number(t.amount)
  })

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/finance" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-1">
          <ArrowLeft className="w-4 h-4" />
          Finance
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Monthly Budgets</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Set limits for each expense category. Tracked against {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.
        </p>
      </div>

      <BudgetManager
        photographerId={user.id}
        currency={photographer?.currency ?? 'NGN'}
        budgets={(budgets ?? []) as any}
        spending={spending}
      />
    </div>
  )
}
