import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'

export async function POST(request: NextRequest) {
  // ── 1. Verify caller is the admin ──────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  const body = await request.json()
  const { photographerId, plan_tier, promo_plan, promo_expires_at } = body

  if (!photographerId || !plan_tier) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const validTiers = ['starter', 'creator', 'pro', 'studio']
  if (!validTiers.includes(plan_tier)) {
    return NextResponse.json({ error: 'Invalid plan_tier' }, { status: 400 })
  }
  if (promo_plan && !validTiers.includes(promo_plan)) {
    return NextResponse.json({ error: 'Invalid promo_plan' }, { status: 400 })
  }

  // ── 3. Update via admin client (bypasses RLS) ──────────────────────────────
  const admin = createAdminClient()
  const { error } = await admin
    .from('photographers')
    .update({
      plan_tier,
      promo_plan:       promo_plan       ?? null,
      promo_expires_at: promo_expires_at ?? null,
    })
    .eq('id', photographerId)

  if (error) {
    console.error('Admin update-plan error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
