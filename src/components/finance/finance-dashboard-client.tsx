'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, Plus, ArrowRight, Edit2, Link2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCategoryDef } from '@/lib/finance'
import type { FinanceTransaction, FinanceBudget } from '@/types/database'

interface MonthData {
  label: string
  income: number
  expenses: number
}

interface CategorySpend {
  category: string
  amount: number
}

interface FinanceDashboardClientProps {
  currency: string
  totalIncome: number
  totalExpenses: number
  recentTransactions: FinanceTransaction[]
  monthlyData: MonthData[]
  categorySpending: CategorySpend[]
  budgets: FinanceBudget[]
  budgetSpending: Record<string, number>
}

// ── Simple bar chart ──────────────────────────────────────────────────────────
function MonthlyBarChart({ data, currency }: { data: MonthData[]; currency: string }) {
  const max = Math.max(...data.flatMap(m => [m.income, m.expenses]), 1)
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-32">
        {data.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex gap-0.5 items-end h-28">
              <div
                className="flex-1 bg-green-500 rounded-t-sm min-h-[2px] transition-all duration-500"
                style={{ height: `${(m.income / max) * 100}%` }}
                title={`Income: ${formatCurrency(m.income, currency)}`}
              />
              <div
                className="flex-1 bg-red-400 rounded-t-sm min-h-[2px] transition-all duration-500"
                style={{ height: `${(m.expenses / max) * 100}%` }}
                title={`Expenses: ${formatCurrency(m.expenses, currency)}`}
              />
            </div>
            <span className="text-[10px] text-gray-400">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-gray-500 justify-end">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Income</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Expenses</span>
      </div>
    </div>
  )
}

// ── SVG donut chart ───────────────────────────────────────────────────────────
function DonutChart({ data, currency }: { data: CategorySpend[]; currency: string }) {
  const total = data.reduce((s, d) => s + d.amount, 0)
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
        No expense data this month
      </div>
    )
  }

  const r = 52
  const cx = 70
  const cy = 70
  const circ = 2 * Math.PI * r
  const strokeW = 22

  let accumulated = 0
  const segments = data.map(d => {
    const cat = getCategoryDef(d.category)
    const segLen = (d.amount / total) * circ
    const seg = { ...d, cat, segLen, offset: accumulated }
    accumulated += segLen
    return seg
  })

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`}>
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.cat.color}
              strokeWidth={strokeW}
              strokeDasharray={`${seg.segLen} ${circ - seg.segLen}`}
              strokeDashoffset={-seg.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          ))}
          <text x={cx} y={cy - 5} textAnchor="middle" fill="#6b7280" fontSize="9" fontWeight="500">TOTAL</text>
          <text x={cx} y={cy + 9} textAnchor="middle" fill="#111827" fontSize="11" fontWeight="700">
            {formatCurrency(total, currency).replace(/[^0-9.,kKmM₦]/g, '')}
          </text>
        </svg>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {segments.slice(0, 6).map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.cat.color }} />
            <span className="text-xs text-gray-600 truncate flex-1">{seg.cat.label}</span>
            <span className="text-xs font-semibold text-gray-800 flex-shrink-0">
              {Math.round((seg.amount / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export function FinanceDashboardClient({
  currency,
  totalIncome,
  totalExpenses,
  recentTransactions,
  monthlyData,
  categorySpending,
  budgets,
  budgetSpending,
}: FinanceDashboardClientProps) {
  const router = useRouter()
  const netBalance = totalIncome - totalExpenses
  const budgetMap = Object.fromEntries(budgets.map(b => [b.category, b]))

  // Budgets that have spending or a limit set
  const activeBudgets = budgets.slice(0, 4)

  return (
    <div className="space-y-5">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/finance/transactions?type=income"
          className="bg-white rounded-xl border border-gray-100 p-5 hover:border-green-200 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Income</p>
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome, currency)}</p>
          <p className="text-xs text-gray-400 mt-1">This month · tap to view</p>
        </Link>

        <Link
          href="/finance/transactions?type=expense"
          className="bg-white rounded-xl border border-gray-100 p-5 hover:border-red-200 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Expenses</p>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses, currency)}</p>
          <p className="text-xs text-gray-400 mt-1">This month · tap to view</p>
        </Link>

        <div className={`rounded-xl border p-5 ${netBalance >= 0 ? 'bg-green-600 border-green-600' : 'bg-red-500 border-red-500'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Net Balance</p>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(Math.abs(netBalance), currency)}</p>
          <p className="text-xs text-white/70 mt-1">{netBalance >= 0 ? 'Surplus' : 'Deficit'} this month</p>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Income vs Expenses</h3>
            <span className="text-xs text-gray-400">Last 6 months</span>
          </div>
          <MonthlyBarChart data={monthlyData} currency={currency} />
        </div>

        {/* Category donut */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Spending by Category</h3>
            <span className="text-xs text-gray-400">This month</span>
          </div>
          <DonutChart data={categorySpending} currency={currency} />
        </div>
      </div>

      {/* ── Budget overview ── */}
      {budgets.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Budget Overview</h3>
            <Link href="/finance/budgets" className="text-xs text-green-600 hover:underline font-medium flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeBudgets.map(b => {
              const spent = budgetSpending[b.category] ?? 0
              const pct   = Math.min((spent / b.monthly_limit) * 100, 100)
              const over  = spent > b.monthly_limit
              const warn  = pct >= 80 && !over
              const cat   = getCategoryDef(b.category)
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-gray-600 font-medium">{cat.label}</span>
                    </div>
                    <span className={`font-semibold ${over ? 'text-red-600' : warn ? 'text-amber-600' : 'text-gray-600'}`}>
                      {formatCurrency(spent, currency)} / {formatCurrency(b.monthly_limit, currency)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recent transactions ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-sm">Recent Transactions</h3>
          <Link href="/finance/transactions" className="text-xs text-green-600 hover:underline font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-3">No transactions yet</p>
            <Link
              href="/finance/new"
              className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add your first transaction
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentTransactions.map(t => {
              const cat = getCategoryDef(t.category)
              return (
                <div
                  key={t.id}
                  onClick={() => router.push(`/finance/${t.id}/edit`)}
                  className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50 -mx-5 px-5 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cat.color + '20' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      {t.source === 'payment_sync' && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <Link2 className="w-2.5 h-2.5" />
                          Invoice
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{cat.label} · {formatDate(t.date)}</p>
                  </div>
                  <p className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
