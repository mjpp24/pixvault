import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if photographer profile exists, create if not (Google OAuth)
      const { data: profile } = await supabase
        .from('photographers')
        .select('id, onboarding_completed')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        // First-time Google OAuth — create minimal profile and go to onboarding
        const username = data.user.email?.split('@')[0].replace(/[^a-z0-9_-]/g, '').substring(0, 30) ?? `user${Date.now()}`
        await supabase.from('photographers').insert({
          id: data.user.id,
          full_name: data.user.user_metadata.full_name ?? data.user.email ?? 'Photographer',
          username,
          email: data.user.email ?? '',
          currency: 'NGN',
          brand_color: '#6366f1',
          onboarding_completed: false,
        })
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      }

      if (!profile.onboarding_completed) {
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin))
}
