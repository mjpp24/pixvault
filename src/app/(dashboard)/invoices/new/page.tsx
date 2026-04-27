import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvoiceBuilder } from '@/components/invoice/invoice-builder'

export const metadata = { title: 'New Invoice' }

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: photographer }, { data: clients }, { data: galleries }] = await Promise.all([
    supabase.from('photographers').select('*').eq('id', user.id).single(),
    supabase.from('clients').select('id, name, email, address, city, country, phone').eq('photographer_id', user.id).order('name'),
    supabase.from('galleries').select('id, title, status').eq('photographer_id', user.id).eq('status', 'published').order('title'),
  ])

  if (!photographer) redirect('/login')

  // Generate invoice number
  const { data: invoiceNumber } = await supabase.rpc('get_next_invoice_number', {
    photographer_uuid: user.id,
  })

  return (
    <InvoiceBuilder
      photographer={photographer}
      clients={clients ?? []}
      galleries={galleries ?? []}
      invoiceNumber={invoiceNumber ?? `${photographer.invoice_prefix}-001`}
      mode="create"
    />
  )
}
