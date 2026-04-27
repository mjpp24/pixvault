import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { InvoiceBuilder } from '@/components/invoice/invoice-builder'

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: photographer },
    { data: invoice },
    { data: clients },
    { data: galleries },
  ] = await Promise.all([
    supabase.from('photographers').select('*').eq('id', user.id).single(),
    supabase.from('invoices').select('*, invoice_items(*)').eq('id', id).eq('photographer_id', user.id).single(),
    supabase.from('clients').select('id, name, email, address, city, country, phone').eq('photographer_id', user.id).order('name'),
    supabase.from('galleries').select('id, title, status').eq('photographer_id', user.id).eq('status', 'published').order('title'),
  ])

  if (!photographer || !invoice) notFound()

  return (
    <InvoiceBuilder
      photographer={photographer}
      clients={clients ?? []}
      galleries={galleries ?? []}
      invoiceNumber={invoice.invoice_number}
      mode="edit"
      existingInvoice={invoice as any}
    />
  )
}
