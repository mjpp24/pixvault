import Link from 'next/link'
import { AuthPhotoBackground } from '@/components/auth/auth-photo-background'

const FEATURES = [
  { icon: '📸', text: 'Up to 1 TB storage — from 5 GB Starter to 1 TB Studio' },
  { icon: '🎬', text: 'HD & 4K video delivery on Pro and Studio plans' },
  { icon: '💳', text: 'Collect Paystack payments — zero commission, ever' },
  { icon: '📄', text: 'Professional invoices with PDF generation & email delivery' },
]

const STATS = [
  { value: '10,000+', label: 'Galleries delivered' },
  { value: '₦0',      label: 'Commission we take' },
  { value: '4K',      label: 'Max video quality' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — brand ──────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14 overflow-hidden"
        style={{ background: '#080c10' }}
      >
        {/* Full-bleed animated photo slideshow */}
        <AuthPhotoBackground />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center">
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
            <span className="text-white text-xl font-bold tracking-tight">PixVault</span>
          </Link>
          <p className="text-white/40 text-xs mt-2 ml-0.5">Professional photo & video delivery</p>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-green-400">
              For professional photographers
            </span>
            <h2 className="text-white text-4xl font-bold leading-tight mt-3">
              Deliver galleries<br />your clients will{' '}
              <em className="italic text-green-400">love.</em>
            </h2>
            <p className="text-white/55 mt-4 text-base leading-relaxed max-w-sm">
              Upload, share, collect payments, manage client selections, and send professional
              invoices — all from one beautifully crafted platform.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3.5">
            {FEATURES.map(item => (
              <div key={item.text} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 text-sm">
                  {item.icon}
                </div>
                <p className="text-white/70 text-sm leading-relaxed pt-0.5">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex gap-6 pt-2">
            {STATS.map(stat => (
              <div key={stat.label}>
                <p className="text-white font-bold text-xl">{stat.value}</p>
                <p className="text-white/40 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/25 text-xs">
            Trusted by photographers across Nigeria, Kenya, Ghana, Cameroon & Benin Republic
          </p>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#fafaf9]">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 px-6 py-5 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-base font-bold text-gray-900">PixVault</span>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-[400px]">
            {children}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} PixVault Technologies
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </div>

    </div>
  )
}
