'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Images,
  Users,
  FileText,
  CreditCard,
  Star,
  Settings,
  Menu,
  X,
  LogOut,
  Search,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Photographer } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { NotificationBell } from './notification-bell'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/galleries', icon: Images, label: 'Galleries' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/invoices', icon: FileText, label: 'Invoices' },
  { href: '/finance', icon: Wallet, label: 'Finance' },
  { href: '/payments', icon: CreditCard, label: 'Payments' },
  { href: '/reviews', icon: Star, label: 'Reviews' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

interface DashboardShellProps {
  children: React.ReactNode
  photographer: Photographer
  isGuest?: boolean
}

export function DashboardShell({ children, photographer, isGuest }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
  }

  const initials = photographer.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden pt-3">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">PixVault</span>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photographer info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {photographer.profile_photo_url ? (
                <img
                  src={photographer.profile_photo_url}
                  alt={photographer.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-green-600">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {photographer.business_name || photographer.full_name}
              </p>
              <p className="text-xs text-gray-400 truncate">@{photographer.username}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn('w-4.5 h-4.5', isActive ? 'text-green-600' : 'text-gray-400')}
                  style={{ width: '18px', height: '18px' }}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut style={{ width: '18px', height: '18px' }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center gap-4 px-4 sm:px-6 flex-shrink-0">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search galleries, clients, invoices..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        {/* Guest banner */}
        {isGuest && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start sm:items-center justify-between gap-3 flex-shrink-0">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">You&apos;re exploring as a guest.</span>{' '}
              <span className="hidden sm:inline">Create a free account to save your work and unlock all features.</span>
              <span className="sm:hidden">Sign up to save your work.</span>
            </p>
            <Link
              href="/signup"
              className="text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex-shrink-0"
            >
              Create account
            </Link>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
