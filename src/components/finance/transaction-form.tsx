'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/finance'
import type { FinanceTransaction } from '@/types/database'

const CUSTOM_COLOR = '#64748b'
const PRESET_SKIP  = ['other_expense', 'other_income']

interface TransactionFormProps {
  photographerId: string
  currency: string
  existing?: FinanceTransaction
}

export function TransactionForm({ photographerId, currency, existing }: TransactionFormProps) {
  const router   = useRouter()
  const supabase = createClient()
  const isEdit   = !!existing
  const isSynced = existing?.source === 'payment_sync'

  const [type, setType]       = useState<'income' | 'expense'>(existing?.type ?? 'expense')
  const [title, setTitle]     = useState(existing?.title ?? '')
  const [amount, setAmount]   = useState(existing?.amount?.toString() ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [date, setDate]       = useState(existing?.date ?? new Date().toISOString().split('T')[0])
  const [note, setNote]       = useState(existing?.note ?? '')
  const [saving, setSaving]   = useState(false)

  // Custom categories fetched from DB
  const [customCats, setCustomCats] = useState<string[]>([])

  // Add-more UI state
  const [addingNew, setAddingNew]   = useState(false)
  const [newLabel, setNewLabel]     = useState('')

  const presets = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
    .filter(c => !PRESET_SKIP.includes(c.value))

  const isPreset = useCallback((cat: string) =>
    INCOME_CATEGORIES.some(c => c.value === cat) ||
    EXPENSE_CATEGORIES.some(c => c.value === cat),
  [])

  // Load saved custom categories for this photographer + type
  const loadCustomCats = useCallback(async (t: 'income' | 'expense') => {
    const { data } = await supabase
      .from('finance_custom_categories')
      .select('label')
      .eq('photographer_id', photographerId)
      .eq('type', t)
      .order('created_at', { ascending: true })
    setCustomCats((data ?? []).map(r => r.label))
  }, [supabase, photographerId])

  useEffect(() => { loadCustomCats(type) }, [type, loadCustomCats])

  // If editing a transaction whose category is custom, make sure it appears
  useEffect(() => {
    if (existing?.category && !isPreset(existing.category)) {
      setCustomCats(prev => prev.includes(existing.category) ? prev : [existing.category, ...prev])
    }
  }, [existing, isPreset])

  const handleTypeSwitch = (t: 'income' | 'expense') => {
    setType(t)
    setCategory('')
    setAddingNew(false)
    setNewLabel('')
  }

  const handleSaveNewCat = async () => {
    const label = newLabel.trim()
    if (!label) return
    if (customCats.map(c => c.toLowerCase()).includes(label.toLowerCase())) {
      setCategory(customCats.find(c => c.toLowerCase() === label.toLowerCase())!)
      setAddingNew(false)
      setNewLabel('')
      return
    }
    // Persist to DB
    const { error } = await supabase
      .from('finance_custom_categories')
      .insert({ photographer_id: photographerId, type, label })
    if (error && !error.message.includes('unique')) {
      toast.error('Could not save category')
      return
    }
    setCustomCats(prev => [...prev, label])
    setCategory(label)
    setAddingNew(false)
    setNewLabel('')
  }

  const handleDeleteCat = async (label: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase
      .from('finance_custom_categories')
      .delete()
      .eq('photographer_id', photographerId)
      .eq('type', type)
      .eq('label', label)
    setCustomCats(prev => prev.filter(c => c !== label))
    if (category === label) setCategory('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required'); return }
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (!category) { toast.error('Select a category'); return }

    setSaving(true)
    try {
      const payload = {
        photographer_id: photographerId,
        type,
        title: title.trim(),
        amount: amt,
        category,
        date,
        note: note.trim() || null,
      }

      if (isEdit) {
        const { error } = await supabase.from('finance_transactions').update(payload).eq('id', existing.id)
        if (error) throw error
        toast.success('Transaction updated')
      } else {
        const { error } = await supabase.from('finance_transactions').insert(payload)
        if (error) throw error
        toast.success('Transaction saved')
      }
      router.push('/finance')
      router.refresh()
    } catch {
      toast.error('Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existing || !confirm('Delete this transaction?')) return
    setSaving(true)
    const { error } = await supabase.from('finance_transactions').delete().eq('id', existing.id)
    if (error) { toast.error('Failed to delete'); setSaving(false); return }
    toast.success('Transaction deleted')
    router.push('/finance')
    router.refresh()
  }

  const inputCls  = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors'
  const lockedCls = 'w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-500 bg-gray-50 cursor-not-allowed'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Synced banner */}
      {isSynced && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl p-4">
          <Link2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Auto-synced from a confirmed payment</p>
            <p className="text-xs text-green-600 mt-0.5">Amount and date are locked. You can update the category or note.</p>
          </div>
        </div>
      )}

      {/* Type toggle */}
      <div className={`flex rounded-xl border overflow-hidden ${isSynced ? 'border-gray-100 opacity-60 pointer-events-none' : 'border-gray-200'}`}>
        {(['expense', 'income'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeSwitch(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors capitalize ${
              type === t
                ? t === 'income' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t === 'income' ? '↑ Income' : '↓ Expense'}
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Title / Description</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={type === 'income' ? 'e.g. Wedding photography session' : 'e.g. Adobe subscription'}
          className={inputCls}
          required
        />
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">
          Amount ({currency})
          {isSynced && <span className="ml-2 text-xs text-gray-400 font-normal">· from payment</span>}
        </label>
        {isSynced ? (
          <div className={lockedCls}>{amount}</div>
        ) : (
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            className={inputCls}
            required
          />
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Category</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Preset categories */}
          {presets.map(cat => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                category === cat.value
                  ? 'border-transparent text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
              }`}
              style={category === cat.value ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              {cat.label}
            </button>
          ))}

          {/* Saved custom categories */}
          {customCats.map(label => (
            <button
              key={label}
              type="button"
              onClick={() => setCategory(label)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                category === label
                  ? 'border-transparent text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
              }`}
              style={category === label ? { backgroundColor: CUSTOM_COLOR, borderColor: CUSTOM_COLOR } : {}}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CUSTOM_COLOR }} />
              <span className="flex-1 truncate">{label}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={e => handleDeleteCat(label, e)}
                onKeyDown={e => e.key === 'Enter' && handleDeleteCat(label, e as unknown as React.MouseEvent)}
                className={`opacity-0 group-hover:opacity-100 transition-opacity ml-auto ${category === label ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          ))}

          {/* Add More button */}
          <button
            type="button"
            onClick={() => { setAddingNew(true); setCategory('') }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-green-500 hover:text-green-600 bg-white text-xs font-medium transition-all"
          >
            <Plus className="w-3 h-3 flex-shrink-0" />
            Add More
          </button>
        </div>

        {/* New category input */}
        {addingNew && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveNewCat() } if (e.key === 'Escape') { setAddingNew(false); setNewLabel('') } }}
              placeholder="e.g. Club, Gym, Fuel…"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveNewCat}
              className="px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setAddingNew(false); setNewLabel('') }}
              className="px-3 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">
          Date
          {isSynced && <span className="ml-2 text-xs text-gray-400 font-normal">· from payment</span>}
        </label>
        {isSynced ? (
          <div className={lockedCls}>{date}</div>
        ) : (
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={inputCls}
            required
          />
        )}
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Note <span className="text-gray-400">(optional)</span></label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {isEdit && !isSynced && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 bg-green-600"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Transaction'}
        </button>
      </div>
    </form>
  )
}
