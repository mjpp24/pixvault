import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, full_name, business_name, username, email, phone, currency } = body

    if (!userId || !full_name || !username || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('photographers').insert({
      id: userId,
      full_name,
      business_name: business_name || null,
      username,
      email,
      phone,
      currency: currency ?? 'NGN',
      brand_color: '#6366f1',
      onboarding_completed: body.onboarding_completed ?? false,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'username_taken' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
