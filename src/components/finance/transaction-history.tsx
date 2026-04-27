'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, Edit2, TrendingUp, TrendingDown, Link2 } from 'lucide-react'
import { getCategoryDef, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/finance'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { FinanceTransaction } from '@/types/database'

interface TransactionHistoryProps {
  transactions: FinanceTransaction[]
  currency: string
  initialType?: '' | 'income' | 'expense'
}

const ALL_CATS = [
  { value: '', label: 'All categories' },
  ...INCOME_CATEGORIES.map(c => ({ ...c, label: `↑ ${c.label}` })),
  ...EXPENSE_CATEGORIES.map(c => ({ ...c, label: `↓ ${c.label}` })),
]

export function TransactionHistory({ transactions, currency, initialType = '' }: TransactionHistoryProps) {
  const router = useRouter()
  const [search, setSearch]     = useState('')
  const [typeFilter, setType]   = useState<'' | 'income' | 'expense'>(initialType)
  const [catFilter, setCat]     = useState('')
  const [monthFilter, setMonth] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Build unique month options from transactions
  const monthOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'All time' }]
    transactions.forEach(t => {
      const m = t.date.slice(0, 7)
      if (!seen.has(m)) {
        seen.add(m)
        const d = new Date(t.date + 'T00:00:00')
        opts.push({ value: m, label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) })
      }
    })
    return opts
  }, [transactions])

  const filtered = useMemo(() => {
    let list = transactions
    if (search.trim()) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || (t.note ?? '').toLowerCase().includes(search.toLowerCase()))
    if (typeFilter) list = list.filter(t => t.type === typeFilter)
    if (catFilter)  list = list.filter(t => t.category === catFilter)
    if (monthFilter) list = list.filter(t => t.date.startsWith(monthFilter))
    return list
  }, [transactions, search, typeFilter, catFilter, monthFilter])

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            showFilters || typeFilter || catFilter || monthFilter
              ? 'bg-green-600 text-white border-green-600'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Type</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
              {([['', 'All'], ['income', '↑ Income'], ['expense', '↓ Expense']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setType(val as '' | 'income' | 'expense')}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${typeFilter === val ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Category</label>
            <select
              value={catFilter}
              onChange={e => setCat(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {ALL_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {/* Month */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Month</label>
            <select
              value={monthFilter}
              onChange={e => setMonth(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {/* Clear */}
          {(typeFilter || catFilter || monthFilter) && (
            <button
              onClick={() => { setType(''); setCat(''); setMonth('') }}
              className="sm:col-span-3 text-xs text-red-500 hover:text-red-700 text-right"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Summary row */}
      {filtered.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-green-600 font-medium">
            <TrendingUp className="w-4 h-4" />
            {formatCurrency(totalIncome, currency)}
          </div>
          <div className="flex items-center gap-1.5 text-red-500 font-medium">
            <TrendingDown className="w-4 h-4" />
            {formatCurrency(totalExpense, currency)}
          </div>
          <span className="text-gray-400 text-xs self-center">{filtered.length} transactions</span>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No transactions found</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {filtered.map(t => {
            const cat = getCategoryDef(t.category)
            return (
              <div
                key={t.id}
                onClick={() => router.push(`/finance/${t.id}/edit`)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {/* Category dot */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cat.color + '20' }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                </div>

                {/* Info */}
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
                  {t.note && <p className="text-xs text-gray-400 truncate mt-0.5">{t.note}</p>}
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{t.type}</p>
                </div>

                <Edit2 className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
