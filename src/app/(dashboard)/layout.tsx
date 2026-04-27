import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographers')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!photographer) redirect('/onboarding')

  if (!photographer.onboarding_completed) redirect('/onboarding')

  const isGuest = user.is_anonymous ?? false

  return <DashboardShell photographer={photographer} isGuest={isGuest}>{children}</DashboardShell>
}
