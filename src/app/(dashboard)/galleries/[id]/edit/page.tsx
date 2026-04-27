import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { GalleryEditForm } from '@/components/gallery/gallery-edit-form'

export default async function GalleryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: gallery }, { data: clients }] = await Promise.all([
    supabase.from('galleries').select('*').eq('id', id).eq('photographer_id', user.id).single(),
    supabase.from('clients').select('id, name, email').eq('photographer_id', user.id).order('name'),
  ])

  if (!gallery) notFound()

  return <GalleryEditForm gallery={gallery} clients={clients ?? []} />
}
