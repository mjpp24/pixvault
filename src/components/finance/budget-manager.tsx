'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { EXPENSE_CATEGORIES, getCategoryDef } from '@/lib/finance'
import { formatCurrency } from '@/lib/utils'
import type { FinanceBudget } from '@/types/database'

interface BudgetManagerProps {
  photographerId: string
  currency: string
  budgets: FinanceBudget[]
  spending: Record<string, number> // category -> amount spent this month
}

export function BudgetManager({ photographerId, currency, budgets: initial, spending }: BudgetManagerProps) {
  const supabase = createClient()
  const [budgets, setBudgets] = useState<FinanceBudget[]>(initial)
  const [editing, setEditing]   = useState<string | null>(null) // category being edited
  const [limitInput, setLimitInput] = useState('')
  const [saving, setSaving] = useState(false)

  const budgetMap = Object.fromEntries(budgets.map(b => [b.category, b]))

  const startEdit = (category: string) => {
    setEditing(category)
    setLimitInput(budgetMap[category]?.monthly_limit?.toString() ?? '')
  }

  const saveBudget = async (category: string) => {
    const limit = parseFloat(limitInput)
    if (isNaN(limit) || limit <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    const existing = budgetMap[category]
    try {
      if (existing) {
        const { data, error } = await supabase
          .from('finance_budgets')
          .update({ monthly_limit: limit })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        setBudgets(prev => prev.map(b => b.id === existing.id ? data as FinanceBudget : b))
      } else {
        const { data, error } = await supabase
          .from('finance_budgets')
          .insert({ photographer_id: photographerId, category, monthly_limit: limit })
          .select()
          .single()
        if (error) throw error
        setBudgets(prev => [...prev, data as FinanceBudget])
      }
      toast.success('Budget saved')
      setEditing(null)
    } catch {
      toast.error('Failed to save budget')
    } finally {
      setSaving(false)
    }
  }

  const deleteBudget = async (category: string) => {
    const existing = budgetMap[category]
    if (!existing) return
    const { error } = await supabase.from('finance_budgets').delete().eq('id', existing.id)
    if (error) { toast.error('Failed to remove budget'); return }
    setBudgets(prev => prev.filter(b => b.id !== existing.id))
    toast.success('Budget removed')
    setEditing(null)
  }

  return (
    <div className="space-y-3">
      {EXPENSE_CATEGORIES.map(cat => {
        const budget = budgetMap[cat.value]
        const spent  = spending[cat.value] ?? 0
        const limit  = budget?.monthly_limit ?? 0
        const pct    = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
        const over   = limit > 0 && spent > limit
        const warn   = limit > 0 && pct >= 80 && !over
        const isEditingThis = editing === cat.value

        return (
          <div key={cat.value} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-sm font-medium text-gray-800">{cat.label}</span>
              </div>
              {budget ? (
                <div className="flex items-center gap-3">
                  {over && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">OVER BUDGET</span>
                  )}
                  {warn && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">NEAR LIMIT</span>
                  )}
                  <button
                    onClick={() => startEdit(cat.value)}
                    className="text-xs text-green-600 hover:underline font-medium"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(cat.value)}
                  className="text-xs text-green-600 hover:underline font-medium"
                >
                  + Set budget
                </button>
              )}
            </div>

            {/* Spending vs budget */}
            {budget && !isEditingThis && (
              <>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{formatCurrency(spent, currency)} spent</span>
                  <span>of {formatCurrency(limit, currency)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-green-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            )}

            {/* No budget set */}
            {!budget && !isEditingThis && spent > 0 && (
              <p className="text-xs text-gray-400">
                {formatCurrency(spent, currency)} spent — no budget set
              </p>
            )}

            {/* Edit form */}
            {isEditingThis && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-gray-400">{currency}</span>
                <input
                  type="number"
                  value={limitInput}
                  onChange={e => setLimitInput(e.target.value)}
                  placeholder="Monthly limit"
                  min="1"
                  step="any"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveBudget(cat.value) }}
                />
                <button
                  onClick={() => saveBudget(cat.value)}
                  disabled={saving}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
                {budget && (
                  <button
                    onClick={() => deleteBudget(cat.value)}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={() => setEditing(null)}
                  className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
