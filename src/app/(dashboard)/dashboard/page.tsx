import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Images, Users, DollarSign, FileText, TrendingUp, Eye, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Gallery, Invoice } from '@/types/database'

export const metadata = { title: 'Dashboard' }

async function getDashboardData(photographerId: string) {
  const supabase = await createClient()

  const [
    { count: galleryCount },
    { count: clientCount },
    { data: recentGalleries },
    { data: recentInvoices },
    { data: payments },
  ] = await Promise.all([
    supabase.from('galleries').select('*', { count: 'exact', head: true }).eq('photographer_id', photographerId),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('photographer_id', photographerId),
    supabase
      .from('galleries')
      .select('*, clients(name)')
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('invoices')
      .select('*, clients(name)')
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('payments')
      .select('amount, currency, status, created_at')
      .eq('photographer_id', photographerId)
      .eq('status', 'successful'),
  ])

  const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0
  const currency = payments?.[0]?.currency ?? 'NGN'

  return {
    galleryCount: galleryCount ?? 0,
    clientCount: clientCount ?? 0,
    totalRevenue,
    currency,
    recentGalleries: recentGalleries ?? [],
    recentInvoices: recentInvoices ?? [],
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographers')
    .select('full_name, currency')
    .eq('id', user.id)
    .single()

  const data = await getDashboardData(user.id)

  const firstName = photographer?.full_name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const stats = [
    {
      label: 'Total Galleries',
      value: data.galleryCount.toString(),
      icon: Images,
      color: 'indigo',
      href: '/galleries',
    },
    {
      label: 'Total Clients',
      value: data.clientCount.toString(),
      icon: Users,
      color: 'violet',
      href: '/clients',
    },
    {
      label: 'Revenue Collected',
      value: formatCurrency(data.totalRevenue, photographer?.currency ?? 'NGN'),
      icon: DollarSign,
      color: 'green',
      href: '/payments',
    },
    {
      label: 'Total Invoices',
      value: data.recentInvoices.length.toString(),
      icon: FileText,
      color: 'amber',
      href: '/invoices',
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Here&apos;s what&apos;s happening with your business</p>
        </div>
        <Link
          href="/galleries/new"
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Gallery
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  stat.color === 'indigo' && 'bg-green-50',
                  stat.color === 'violet' && 'bg-violet-50',
                  stat.color === 'green' && 'bg-green-50',
                  stat.color === 'amber' && 'bg-amber-50'
                )}
              >
                <stat.icon
                  className={cn(
                    'w-5 h-5',
                    stat.color === 'indigo' && 'text-green-600',
                    stat.color === 'violet' && 'text-violet-600',
                    stat.color === 'green' && 'text-green-600',
                    stat.color === 'amber' && 'text-amber-600'
                  )}
                />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Create Gallery', href: '/galleries/new', icon: '🖼️' },
          { label: 'New Invoice', href: '/invoices/new', icon: '📄' },
          { label: 'Add Client', href: '/clients/new', icon: '👤' },
          { label: 'View Payments', href: '/payments', icon: '💳' },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm hover:border-green-200 transition-all min-w-0"
          >
            <span className="text-lg sm:text-xl flex-shrink-0">{action.icon}</span>
            <span className="text-xs sm:text-sm font-medium text-gray-700 leading-tight">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent galleries + invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Galleries */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Galleries</h2>
            <Link href="/galleries" className="text-xs text-green-600 hover:underline font-medium">
              View all
            </Link>
          </div>
          {data.recentGalleries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Images className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No galleries yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Create your first gallery to get started</p>
              <Link
                href="/galleries/new"
                className="mt-3 text-xs text-green-600 font-medium hover:underline"
              >
                Create Gallery →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.recentGalleries.map((gallery: any) => (
                <Link
                  key={gallery.id}
                  href={`/galleries/${gallery.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {gallery.cover_photo_url ? (
                      <img src={gallery.cover_photo_url} alt={gallery.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Images className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{gallery.title}</p>
                    <p className="text-xs text-gray-400">
                      {gallery.clients?.name ?? 'No client'} · {gallery.total_photos} photos
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={gallery.status as 'draft' | 'published' | 'archived'}>
                      {gallery.status}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Eye className="w-3 h-3" />
                      {gallery.views}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
            <Link href="/invoices" className="text-xs text-green-600 hover:underline font-medium">
              View all
            </Link>
          </div>
          {data.recentInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <FileText className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No invoices yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Create your first invoice to bill clients</p>
              <Link
                href="/invoices/new"
                className="mt-3 text-xs text-green-600 font-medium hover:underline"
              >
                Create Invoice →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.recentInvoices.map((invoice: any) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{invoice.title}</p>
                    <p className="text-xs text-gray-400">
                      {invoice.clients?.name ?? 'No client'} · {formatDate(invoice.issue_date)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={invoice.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'}>
                      {invoice.status}
                    </Badge>
                    <span className="text-xs font-medium text-gray-900">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
