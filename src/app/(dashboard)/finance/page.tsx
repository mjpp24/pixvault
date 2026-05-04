import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { FinanceDashboardClient } from '@/components/finance/finance-dashboard-client'
import { getMonthRange, getLast6MonthsRanges } from '@/lib/finance'

export const metadata = { title: 'Finance' }

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographers')
    .select('currency')
    .eq('id', user.id)
    .single()
  const currency = photographer?.currency ?? 'NGN'

  // Parse ?month=YYYY-MM, fall back to current month
  const params = await searchParams
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() // 0-indexed
  if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
    const [y, m] = params.month.split('-').map(Number)
    year = y
    month = m - 1 // back to 0-indexed
  }
  const selectedMonth = `${year}-${String(month + 1).padStart(2, '0')}`

  const { start: monthStart, end: monthEnd } = getMonthRange(year, month)
  const sixMonthRanges = getLast6MonthsRanges()
  const sixStart = sixMonthRanges[0].start

  const [
    { data: monthTransactions },
    { data: sixMonthTx },
    { data: budgets },
  ] = await Promise.all([
    supabase
      .from('finance_transactions')
      .select('*')
      .eq('photographer_id', user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('finance_transactions')
      .select('*')
      .eq('photographer_id', user.id)
      .gte('date', sixStart)
      .lte('date', monthEnd),
    supabase
      .from('finance_budgets')
      .select('*')
      .eq('photographer_id', user.id),
  ])

  const tx = monthTransactions ?? []
  const allTx = sixMonthTx ?? []

  // Summary for selected month
  const totalIncome   = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  // Monthly bar chart (always last 6 months from today)
  const monthlyData = sixMonthRanges.map(range => {
    const rangeTx = allTx.filter(t => t.date >= range.start && t.date <= range.end)
    return {
      label: range.label,
      income:   rangeTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      expenses: rangeTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    }
  })

  // Category spending for selected month
  const categorySpendMap: Record<string, number> = {}
  tx.filter(t => t.type === 'expense').forEach(t => {
    categorySpendMap[t.category] = (categorySpendMap[t.category] ?? 0) + Number(t.amount)
  })
  const categorySpending = Object.entries(categorySpendMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  // Budget spending for selected month
  const budgetSpending: Record<string, number> = {}
  tx.filter(t => t.type === 'expense').forEach(t => {
    budgetSpending[t.category] = (budgetSpending[t.category] ?? 0) + Number(t.amount)
  })

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance</h1>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href="/finance/budgets"
            className="hidden sm:inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Budgets
          </Link>
          <Link
            href="/finance/new"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Transaction</span>
            <span className="xs:hidden">Add</span>
          </Link>
        </div>
      </div>

      <FinanceDashboardClient
        currency={currency}
        selectedMonth={selectedMonth}
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        recentTransactions={tx.slice(0, 8) as any}
        monthlyData={monthlyData}
        categorySpending={categorySpending}
        budgets={(budgets ?? []) as any}
        budgetSpending={budgetSpending}
      />
    </div>
  )
}
