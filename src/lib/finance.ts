export type CategoryDef = { value: string; label: string; color: string }

export const INCOME_CATEGORIES: CategoryDef[] = [
  { value: 'photography',   label: 'Photography',           color: '#16a34a' },
  { value: 'freelance',     label: 'Freelance',             color: '#15803d' },
  { value: 'salary',        label: 'Salary / Employment',   color: '#166534' },
  { value: 'gallery_sales', label: 'Gallery Sales',         color: '#4ade80' },
  { value: 'events',        label: 'Events Coverage',       color: '#22c55e' },
  { value: 'retouching',    label: 'Retouching / Editing',  color: '#86efac' },
  { value: 'passive',       label: 'Passive Income',        color: '#6ee7b7' },
  { value: 'gifts',         label: 'Gifts / Bonuses',       color: '#34d399' },
  { value: 'other_income',  label: 'Other Income',          color: '#a7f3d0' },
]

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { value: 'food',          label: 'Food & Dining',         color: '#ef4444' },
  { value: 'rent',          label: 'Housing / Rent',        color: '#dc2626' },
  { value: 'transport',     label: 'Transport',             color: '#f97316' },
  { value: 'equipment',     label: 'Equipment',             color: '#a78bfa' },
  { value: 'software',      label: 'Software / Subs',       color: '#818cf8' },
  { value: 'marketing',     label: 'Marketing',             color: '#f59e0b' },
  { value: 'entertainment', label: 'Entertainment',         color: '#ec4899' },
  { value: 'health',        label: 'Healthcare',            color: '#14b8a6' },
  { value: 'education',     label: 'Education',             color: '#3b82f6' },
  { value: 'utilities',     label: 'Utilities',             color: '#fb923c' },
  { value: 'savings',       label: 'Savings / Investment',  color: '#8b5cf6' },
  { value: 'other_expense', label: 'Other Expenses',        color: '#94a3b8' },
]

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export function getCategoryDef(value: string): CategoryDef {
  return ALL_CATEGORIES.find(c => c.value === value) ?? { value, label: value, color: '#94a3b8' }
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function getCurrentMonthRange() {
  const now = new Date()
  return getMonthRange(now.getFullYear(), now.getMonth())
}

export function getLast6MonthsRanges() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      label: d.toLocaleString('default', { month: 'short' }),
      ...getMonthRange(d.getFullYear(), d.getMonth()),
    }
  })
}

export const SHORT_MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
