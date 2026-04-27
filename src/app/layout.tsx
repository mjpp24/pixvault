import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/shared/query-provider'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'PixVault — Professional Photo & Video Delivery',
    template: '%s | PixVault',
  },
  description:
    'Deliver stunning photo and video galleries to your clients, collect payments, manage selections, and send professional invoices — all in one place.',
  keywords: ['photography', 'gallery', 'photo delivery', 'invoice', 'photographer platform'],
  openGraph: {
    type: 'website',
    siteName: 'PixVault',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  )
}
