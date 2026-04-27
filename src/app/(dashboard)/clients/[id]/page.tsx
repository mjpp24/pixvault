import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, Images, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('photographer_id', user.id)
    .single()

  if (!client) notFound()

  const [{ data: galleries }, { data: invoices }] = await Promise.all([
    supabase.from('galleries').select('id, title, status, total_photos, cover_photo_url, created_at').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('id, invoice_number, title, status, total, currency, issue_date').eq('client_id', id).order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to clients
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              {client.email && <span className="flex items-center gap-1 text-sm text-gray-500"><Mail className="w-3.5 h-3.5" />{client.email}</span>}
              {client.phone && <span className="flex items-center gap-1 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" />{client.phone}</span>}
              {(client.city || client.country) && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {[client.city, client.country].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/galleries/new?client=${id}`} className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <Images className="w-4 h-4" />New Gallery
            </Link>
            <Link href={`/invoices/new?client=${id}`} className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <FileText className="w-4 h-4" />New Invoice
            </Link>
          </div>
        </div>
        {client.notes && <p className="text-sm text-gray-400 mt-2 italic">{client.notes}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Galleries */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Galleries ({galleries?.length ?? 0})</h2>
          </div>
          {!galleries?.length ? (
            <p className="p-5 text-sm text-gray-400">No galleries yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {galleries.map((g) => (
                <Link key={g.id} href={`/galleries/${g.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                  <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                    {g.cover_photo_url ? <img src={g.cover_photo_url} alt="" className="w-full h-full object-cover" /> : <Images className="w-4 h-4 text-gray-300 m-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{g.title}</p>
                    <p className="text-xs text-gray-400">{g.total_photos} photos · {formatDate(g.created_at)}</p>
                  </div>
                  <Badge variant={g.status as any}>{g.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Invoices ({invoices?.length ?? 0})</h2>
          </div>
          {!invoices?.length ? (
            <p className="p-5 text-sm text-gray-400">No invoices yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-600">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-400 truncate">{inv.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total, inv.currency)}</p>
                    <Badge variant={inv.status as any}>{inv.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
