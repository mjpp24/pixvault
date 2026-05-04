import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export const metadata = { title: 'Admin Panel · PixVault' }

export default async function AdminPage() {
  // ── 1. Auth check ──────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdmin(user.email)) redirect('/dashboard')

  // ── 2. Platform data — admin client bypasses RLS ───────────────────────────
  const admin = createAdminClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: photographers },
    { count: totalGalleries },
    { count: totalMedia },
    { count: newThisMonth },
  ] = await Promise.all([
    // All photographers — id, name, email, plan, promo, storage, joined
    admin
      .from('photographers')
      .select('id, full_name, business_name, email, plan_tier, promo_plan, promo_expires_at, storage_used_bytes, created_at')
      .order('created_at', { ascending: false }),

    // Total galleries across the whole platform
    admin
      .from('galleries')
      .select('*', { count: 'exact', head: true }),

    // Total media files
    admin
      .from('gallery_media')
      .select('*', { count: 'exact', head: true }),

    // New photographers who signed up this calendar month
    admin
      .from('photographers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart),
  ])

  const users = photographers ?? []

  // ── 3. Derived stats ───────────────────────────────────────────────────────
  const totalStorageBytes = users.reduce((sum, u) => sum + (u.storage_used_bytes ?? 0), 0)

  const planCounts: Record<string, number> = { starter: 0, creator: 0, pro: 0, studio: 0 }
  users.forEach((u) => {
    const tier = u.plan_tier ?? 'starter'
    planCounts[tier] = (planCounts[tier] ?? 0) + 1
  })

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform overview — visible only to you</p>
      </div>

      <AdminDashboard
        users={users as any}
        totalGalleries={totalGalleries ?? 0}
        totalMedia={totalMedia ?? 0}
        newThisMonth={newThisMonth ?? 0}
        totalStorageBytes={totalStorageBytes}
        planCounts={planCounts}
      />
    </div>
  )
}
