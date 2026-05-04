'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Images, HardDrive, UserPlus,
  Search, ChevronUp, ChevronDown,
  X, Gift, CheckCircle2, Loader2,
} from 'lucide-react'
import { formatFileSize, formatDate } from '@/lib/utils'
import { PLAN_LABELS, PLAN_COLORS, PLAN_LIMITS } from '@/lib/admin'

interface AdminUser {
  id: string
  full_name: string
  business_name: string | null
  email: string
  plan_tier: 'starter' | 'creator' | 'pro' | 'studio'
  promo_plan: 'starter' | 'creator' | 'pro' | 'studio' | null
  promo_expires_at: string | null
  storage_used_bytes: number
  created_at: string
}

interface AdminDashboardProps {
  users: AdminUser[]
  totalGalleries: number
  totalMedia: number
  newThisMonth: number
  totalStorageBytes: number
  planCounts: Record<string, number>
}

type SortKey = 'name' | 'plan' | 'storage' | 'joined'
type SortDir = 'asc' | 'desc'

const PLAN_OPTIONS: Array<'starter' | 'creator' | 'pro' | 'studio'> = ['starter', 'creator', 'pro', 'studio']

// ── Helpers ───────────────────────────────────────────────────────────────────
function isPromoActive(user: AdminUser): boolean {
  if (!user.promo_plan || !user.promo_expires_at) return false
  return new Date(user.promo_expires_at) > new Date()
}

// ── Plan badge ────────────────────────────────────────────────────────────────
function PlanBadge({ tier }: { tier: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${PLAN_COLORS[tier] ?? 'bg-gray-100 text-gray-600'}`}>
      {PLAN_LABELS[tier] ?? tier}
    </span>
  )
}

// ── Promo badge ───────────────────────────────────────────────────────────────
function PromoBadge({ user }: { user: AdminUser }) {
  if (!isPromoActive(user)) return null
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
      <Gift className="w-2.5 h-2.5" />
      Promo
    </span>
  )
}

// ── Storage bar ───────────────────────────────────────────────────────────────
function StorageBar({ used, tier }: { used: number; tier: string }) {
  const limit = PLAN_LIMITS[tier] ?? PLAN_LIMITS.starter
  const pct = Math.min((used / limit) * 100, 100)
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
        {formatFileSize(used)}
      </span>
    </div>
  )
}

// ── Plan Management Modal ─────────────────────────────────────────────────────
function PlanModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser
  onClose: () => void
  onSaved: () => void
}) {
  const [planTier, setPlanTier] = useState(user.plan_tier)
  const [hasPromo, setHasPromo] = useState(isPromoActive(user))
  const [promoPlan, setPromoPlan] = useState<'starter' | 'creator' | 'pro' | 'studio'>(
    user.promo_plan ?? 'pro'
  )
  const [promoExpiry, setPromoExpiry] = useState(
    user.promo_expires_at ? user.promo_expires_at.slice(0, 10) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographerId: user.id,
          plan_tier: planTier,
          promo_plan: hasPromo ? promoPlan : null,
          promo_expires_at: hasPromo && promoExpiry ? new Date(promoExpiry).toISOString() : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to update')
      setSaved(true)
      setTimeout(() => {
        onSaved()
      }, 800)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Min date = today
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">
              {user.business_name || user.full_name}
            </h2>
            <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Plan selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Plan Tier
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PLAN_OPTIONS.map((tier) => (
                <button
                  key={tier}
                  onClick={() => setPlanTier(tier)}
                  className={`px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    planTier === tier
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {PLAN_LABELS[tier]}
                </button>
              ))}
            </div>
          </div>

          {/* Promo section */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-700">Promo Access</span>
              </div>
              {/* Toggle */}
              <button
                onClick={() => setHasPromo((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  hasPromo ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    hasPromo ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {hasPromo && (
              <div className="space-y-3 pt-1">
                {/* Promo plan selector */}
                <div>
                  <label className="block text-xs text-gray-500 font-medium mb-1.5">
                    Give temporary access to:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PLAN_OPTIONS.map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setPromoPlan(tier)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          promoPlan === tier
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {PLAN_LABELS[tier]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiry date */}
                <div>
                  <label className="block text-xs text-gray-500 font-medium mb-1.5">
                    Promo expires on:
                  </label>
                  <input
                    type="date"
                    value={promoExpiry}
                    min={today}
                    onChange={(e) => setPromoExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </>
            ) : saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function AdminDashboard({
  users,
  totalGalleries,
  totalMedia,
  newThisMonth,
  totalStorageBytes,
  planCounts,
}: AdminDashboardProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('joined')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = users
    .filter((u) => {
      const q = search.toLowerCase()
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.business_name ?? '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name')    cmp = a.full_name.localeCompare(b.full_name)
      if (sortKey === 'plan')    cmp = a.plan_tier.localeCompare(b.plan_tier)
      if (sortKey === 'storage') cmp = a.storage_used_bytes - b.storage_used_bytes
      if (sortKey === 'joined')  cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-green-600" />
      : <ChevronDown className="w-3 h-3 text-green-600" />
  }

  const planOrder = ['starter', 'creator', 'pro', 'studio']
  const promoActiveCount = users.filter(isPromoActive).length

  return (
    <>
      {/* ── Plan modal ── */}
      {selectedUser && (
        <PlanModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSaved={() => {
            setSelectedUser(null)
            router.refresh()
          }}
        />
      )}

      <div className="space-y-5">

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Users</p>
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            <p className="text-xs text-gray-400 mt-1">photographers registered</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">New This Month</p>
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{newThisMonth}</p>
            <p className="text-xs text-gray-400 mt-1">joined this month</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Galleries</p>
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <Images className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalGalleries.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{totalMedia.toLocaleString()} total photos &amp; videos</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Platform Storage</p>
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalStorageBytes)}</p>
            <p className="text-xs text-gray-400 mt-1">used across all accounts</p>
          </div>
        </div>

        {/* ── Plan distribution ── */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Users by Plan</h3>
            {promoActiveCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                <Gift className="w-3 h-3" />
                {promoActiveCount} active promo{promoActiveCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {planOrder.map((tier) => {
              const count = planCounts[tier] ?? 0
              const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0
              return (
                <div key={tier} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <PlanBadge tier={tier} />
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{pct}% of users</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Users table ── */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">All Users</h3>
              <p className="text-xs text-gray-400 mt-0.5">Click a row to manage their plan</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="search"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors w-56"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No users found</p>
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {/* Name */}
                    <th className="text-left px-5 pb-2">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-700 transition-colors"
                      >
                        Name <SortIcon col="name" />
                      </button>
                    </th>
                    {/* Plan */}
                    <th className="text-left px-3 pb-2">
                      <button
                        onClick={() => handleSort('plan')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-700 transition-colors"
                      >
                        Plan <SortIcon col="plan" />
                      </button>
                    </th>
                    {/* Storage */}
                    <th className="text-left px-3 pb-2 hidden md:table-cell">
                      <button
                        onClick={() => handleSort('storage')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-700 transition-colors"
                      >
                        Storage <SortIcon col="storage" />
                      </button>
                    </th>
                    {/* Joined */}
                    <th className="text-left px-3 pb-2 hidden sm:table-cell pr-5">
                      <button
                        onClick={() => handleSort('joined')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-700 transition-colors"
                      >
                        Joined <SortIcon col="joined" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((u) => {
                    const promoOn = isPromoActive(u)
                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className="hover:bg-green-50 cursor-pointer transition-colors group"
                      >
                        {/* Name + email */}
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900 truncate max-w-[180px] group-hover:text-green-700 transition-colors">
                            {u.business_name || u.full_name}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">{u.email}</p>
                        </td>
                        {/* Plan + promo badge */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <PlanBadge tier={u.plan_tier} />
                            {promoOn && <PromoBadge user={u} />}
                          </div>
                        </td>
                        {/* Storage bar */}
                        <td className="px-3 py-3 hidden md:table-cell w-40">
                          <StorageBar used={u.storage_used_bytes ?? 0} tier={u.plan_tier} />
                        </td>
                        {/* Joined date */}
                        <td className="px-3 py-3 hidden sm:table-cell pr-5 text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(u.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3">
            Showing {filtered.length} of {users.length} users
          </p>
        </div>
      </div>
    </>
  )
}
