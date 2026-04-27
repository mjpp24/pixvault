'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Images,
  Zap,
  Globe,
  Heart,
  Receipt,
  ShieldCheck,
  Menu,
  X,
  BarChart3,
  FileText,
  TrendingUp,
  Check,
  ChevronDown,
} from 'lucide-react'

// ─── Static data ─────────────────────────────────────────────

const NAV_LINKS = ['Features', 'Galleries', 'Portfolios', 'Pricing']

const TRUST_ITEMS = [
  'Wedding photographers',
  'Content creators',
  'Creatives',
  'Event photographers',
  'Fine art creators',
]

const FEATURES = [
  {
    icon: Images,
    title: 'Up to 1 TB storage',
    desc: 'From 5 GB on Starter to 1 TB on Studio — store and deliver full-resolution photos in password-protected galleries. One link, zero friction.',
  },
  {
    icon: Zap,
    title: 'HD & 4K video delivery',
    desc: 'Upload and deliver HD video on Creator, and 4K on Pro and Studio — up to 3 hours on Pro, unlimited on Studio. Clients stream instantly.',
  },
  {
    icon: Globe,
    title: 'Portfolio + custom domain',
    desc: 'Your own beautifully designed portfolio site. Connect a custom domain on Creator and above — no third-party tools, no extra fees.',
  },
  {
    icon: Heart,
    title: 'Client selections & favourites',
    desc: 'Clients heart and select their favourite images directly in the gallery. Set a selection limit, export the list, and download with one click.',
  },
  {
    icon: Receipt,
    title: 'Invoicing & Paystack payments',
    desc: 'Create branded invoices, collect payments via Paystack (cards, bank transfer, USSD), and track every naira — zero commission, ever.',
  },
  {
    icon: ShieldCheck,
    title: 'Watermark & download controls',
    desc: 'Apply custom watermarks, control who can download what, lock galleries behind a password or a payment gate — your work stays protected.',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Create your account',
    desc: 'Sign up in 60 seconds. No credit card needed for your full 7-day trial.',
    bullets: [] as string[],
  },
  {
    num: '02',
    title: 'Upload photos & videos',
    desc: 'Drag-and-drop full-res photos and videos up to 4K. We optimise, compress, and store everything securely in your plan storage.',
    bullets: [],
  },
  {
    num: '03',
    title: 'Share with your clients',
    desc: 'Send one link. Clients view, select favourites, and download on any device — no account required on their end.',
    bullets: [],
  },
  {
    num: '04',
    title: 'Get paid & grow',
    desc: 'Run your entire studio from one dashboard.',
    bullets: ['Send professional invoices', 'Collect Paystack payments instantly', 'Track revenue & expenses', 'Build your portfolio site'],
  },
]

const TRUST_BADGES = [
  'No credit card required',
  '7-day free trial on all paid plans',
  'Storage from 5 GB to 1 TB',
  'HD & 4K video delivery',
  'Zero commission on payments',
  'Cancel anytime',
]

const FOOTER_LINKS = ['Features', 'Pricing', 'Galleries', 'Privacy', 'Terms']

// ─── Pricing data ─────────────────────────────────────────────

const PLANS = [
  {
    name: 'Starter',
    desc: 'Perfect for getting started',
    monthly: 0,
    yearly: 0,
    storage: '5 GB',
    popular: false,
    cta: 'Get Started Free',
    features: [
      'Up to 3 client galleries',
      '5 GB photo storage',
      'Client photo delivery',
      'Basic portfolio page',
      'Client selections & favourites',
    ],
  },
  {
    name: 'Creator',
    desc: 'For growing photographers',
    monthly: 5000,
    yearly: 4000,
    storage: '50 GB',
    popular: false,
    cta: 'Start Free Trial',
    features: [
      'Unlimited galleries',
      '50 GB photo storage',
      'Remove PixVault branding',
      'Custom portfolio site',
      'Invoice management',
      'HD video support (1 hr)',
      'Client payment collection',
    ],
  },
  {
    name: 'Pro',
    desc: 'For in-demand professionals',
    monthly: 10000,
    yearly: 8000,
    storage: '200 GB',
    popular: true,
    cta: 'Start Free Trial',
    features: [
      'Everything in Creator',
      '200 GB photo storage',
      'Custom domain',
      'Finance & revenue dashboard',
      'Camera RAW support',
      '4K video support (3 hr)',
      'Watermarking & download controls',
      'Priority support',
    ],
  },
  {
    name: 'Studio',
    desc: 'For elite creative teams',
    monthly: 22000,
    yearly: 17500,
    storage: '1 TB',
    popular: false,
    cta: 'Start Free Trial',
    features: [
      'Everything in Pro',
      '1 TB photo storage',
      'Team collaboration (3 seats)',
      'White-label client galleries',
      'Unlimited 4K video',
      'Dedicated account manager',
      'API access',
    ],
  },
]

// ─── FAQ data ─────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — every paid plan comes with a 7-day free trial. No credit card required to start. You only pay when you decide to continue.',
  },
  {
    q: 'Can I change or cancel my plan at any time?',
    a: 'Absolutely. You can upgrade, downgrade, or cancel at any time directly from your account settings. Changes take effect immediately.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major debit/credit cards, bank transfers, and USSD via Paystack. International payments are supported via Stripe.',
  },
  {
    q: 'Do you offer a yearly discount?',
    a: 'Yes — paying annually saves you 20% compared to monthly billing. You can switch billing cycles any time from your dashboard.',
  },
  {
    q: 'Can I use my own custom domain?',
    a: 'Custom domains are available on the Creator plan and above. Add your domain in settings and follow the DNS guide — it takes under 5 minutes.',
  },
  {
    q: 'Can my clients download full-resolution photos?',
    a: 'Yes. You have full control over download permissions per gallery — allow all downloads, specific files only, or disable entirely.',
  },
  {
    q: 'Do you charge commission on client payments?',
    a: 'Never. PixVault takes zero commission on any payments your clients make through the platform. Every kobo goes directly to you.',
  },
  {
    q: 'How does storage work?',
    a: 'Storage counts all photos and videos uploaded across your galleries. Deleted content is cleared from your storage within 24 hours.',
  },
]

// ─── Hero scene: Gallery photo wall ──────────────────────────

const BASE = 'https://extzyijxdstbrfpebttr.supabase.co/storage/v1/object/public/gallery-media/'

const PHOTO_TILES = [
  { src: BASE + '95dd13bb-1369-4538-8699-3dc281499f95/b2d2982e-d9f8-46db-a243-3eff8c76a3b8/1777214219063-g227hjwjh9j.jpg', rowSpan: 2, colSpan: 1, heart: false, label: null             },
  { src: BASE + '95dd13bb-1369-4538-8699-3dc281499f95/dc30b703-c61c-4d36-ac54-b4de9fa097a8/1776389119786-gd27mg9150r.jpg', rowSpan: 1, colSpan: 1, heart: true,  label: 'Benny & Co'    },
  { src: BASE + '95dd13bb-1369-4538-8699-3dc281499f95/b2d2982e-d9f8-46db-a243-3eff8c76a3b8/1777214219062-50mqji98d37.jpg', rowSpan: 2, colSpan: 1, heart: false, label: null             },
  { src: BASE + '95dd13bb-1369-4538-8699-3dc281499f95/dc30b703-c61c-4d36-ac54-b4de9fa097a8/1776389119786-qxpofys98cr.jpg', rowSpan: 1, colSpan: 1, heart: true,  label: null             },
  { src: BASE + '95dd13bb-1369-4538-8699-3dc281499f95/d951646c-1313-40ff-850c-34aa62fb6322/1776476088681-36kvrf77om1.jpg', rowSpan: 1, colSpan: 1, heart: false, label: null             },
  { src: BASE + '95dd13bb-1369-4538-8699-3dc281499f95/b2d2982e-d9f8-46db-a243-3eff8c76a3b8/1777214233617-l2wc1qkh03k.jpg', rowSpan: 2, colSpan: 1, heart: false, label: null             },
  { src: BASE + '95dd13bb-1369-4538-8699-3dc281499f95/b2d2982e-d9f8-46db-a243-3eff8c76a3b8/1777214219063-end36j8ozfa.jpg', rowSpan: 1, colSpan: 2, heart: false, label: 'Wedding Session'},
  { src: BASE + '95dd13bb-1369-4538-8699-3dc281499f95/d951646c-1313-40ff-850c-34aa62fb6322/1776476088682-0wjqqg10ts7.jpg', rowSpan: 1, colSpan: 1, heart: true,  label: null             },
  { src: BASE + '95dd13bb-1369-4538-8699-3dc281499f95/b2d2982e-d9f8-46db-a243-3eff8c76a3b8/1777214219063-6hxvx7n1fdy.jpg', rowSpan: 1, colSpan: 1, heart: false, label: null             },
  { src: BASE + '95dd13bb-1369-4538-8699-3dc281499f95/dc30b703-c61c-4d36-ac54-b4de9fa097a8/1776389119787-3z8x75l0epe.jpg', rowSpan: 1, colSpan: 1, heart: true,  label: null             },
]

function PhotoWallScene() {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ scale: 1.1, opacity: 0 }}
      animate={{ scale: 1.0, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        className="absolute inset-0 p-1.5 gap-1.5"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
        }}
      >
        {PHOTO_TILES.map((tile, i) => (
          <div
            key={i}
            className="rounded-xl relative overflow-hidden bg-stone-900"
            style={{ gridRow: `span ${tile.rowSpan}`, gridColumn: `span ${tile.colSpan}` }}
          >
            <img
              src={tile.src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-black/20" />
            {tile.heart && (
              <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full p-1.5">
                <Heart size={12} fill="white" className="text-white" />
              </div>
            )}
            {tile.label && (
              <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm rounded-md px-2.5 py-1">
                <span className="text-[10px] font-medium text-white/90 tracking-wide">{tile.label}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Hero scene: Finance dashboard ───────────────────────────

function FinanceDarkScene() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-end"
      initial={{ scale: 1.08, opacity: 0 }}
      animate={{ scale: 1.0, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="w-[42%] h-full flex flex-col justify-center pr-12 gap-6 opacity-75">
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.2em] mb-2">Revenue this month</p>
          <p className="text-5xl font-bold text-white leading-none">₦284,500</p>
          <p className="text-green-400 font-semibold mt-2 text-sm">↑ 18% vs last month</p>
        </div>

        <div className="flex items-end gap-2 h-32">
          {[38, 62, 44, 78, 52, 91, 45, 67, 83, 56].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-lg transition-all"
              style={{
                height: `${h}%`,
                background: i === 5 ? '#22c55e' : 'rgba(255,255,255,0.12)',
              }}
            />
          ))}
        </div>
        <div className="flex justify-between -mt-6">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map(m => (
            <span key={m} className="text-[10px] text-white/25 flex-1 text-center">{m}</span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active Galleries', value: '12' },
            { label: 'Total Clients',    value: '48' },
            { label: 'Invoices Paid',    value: '₦1.2M' },
          ].map(stat => (
            <div key={stat.label} className="border border-white/10 rounded-xl p-3">
              <p className="text-white/40 text-[10px] mb-1">{stat.label}</p>
              <p className="text-white font-bold text-base">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Hero scene: Invoice ──────────────────────────────────────

function InvoiceDarkScene() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-end"
      initial={{ scale: 1.08, opacity: 0 }}
      animate={{ scale: 1.0, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="w-[38%] pr-12 opacity-75">
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm">
          <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between">
            <div>
              <p className="text-white/40 text-[9px] font-semibold uppercase tracking-[0.2em] mb-1">Invoice</p>
              <p className="text-white text-xl font-bold">#INV-0042</p>
              <p className="text-white/50 text-sm mt-0.5">Sarah & James Johnson</p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-medium">
                Pending
              </span>
              <p className="text-white/30 text-[10px] mt-1.5">Due: May 1, 2026</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-3">
            {[
              { desc: 'Wedding Photography (8hr)',  price: '₦150,000' },
              { desc: 'Photo Editing & Retouching', price: '₦30,000'  },
              { desc: 'USB Delivery + Packaging',   price: '₦5,000'   },
            ].map(row => (
              <div key={row.desc} className="flex items-center justify-between">
                <p className="text-white/70 text-sm">{row.desc}</p>
                <p className="text-white text-sm font-semibold">{row.price}</p>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-white/5">
            <p className="text-white/60 text-sm font-medium">Total</p>
            <p className="text-green-400 text-xl font-bold">₦185,000</p>
          </div>

          <div className="px-6 py-4">
            <div className="w-full rounded-xl bg-green-600 py-3 text-center">
              <span className="text-white font-semibold text-sm">Pay Now — ₦185,000</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Hero scene controller ────────────────────────────────────

const HERO_SCENES = [
  { id: 'gallery', label: 'Client Galleries', icon: Images    },
  { id: 'finance', label: 'Finance',          icon: BarChart3 },
  { id: 'invoice', label: 'Invoices',         icon: FileText  },
]

function HeroFullBg({ scene, setScene }: { scene: number; setScene: (n: number) => void }) {
  return (
    <>
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {scene === 0 && <PhotoWallScene key="gallery" />}
          {scene === 1 && <FinanceDarkScene key="finance" />}
          {scene === 2 && <InvoiceDarkScene key="invoice" />}
        </AnimatePresence>
      </div>

      {/* Scene indicator pills — bottom-center */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5">
        {HERO_SCENES.map((s, i) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setScene(i)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 border ${
                scene === i
                  ? 'bg-white/10 border-white/30 text-white backdrop-blur-sm'
                  : 'border-white/10 text-white/35 hover:text-white/60 hover:border-white/20'
              }`}
            >
              <Icon size={11} />
              {s.label}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─── Logo ─────────────────────────────────────────────────────

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
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
      <span className={`text-lg font-bold ${light ? 'text-white' : 'text-[var(--foreground)]'}`}>
        PixVault
      </span>
    </Link>
  )
}

// ─── Section heading ──────────────────────────────────────────

function SectionHeading({ eyebrow, heading }: { eyebrow: string; heading: string }) {
  return (
    <div className="flex flex-col gap-4 mb-14">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
          {eyebrow}
        </span>
        <div className="h-px w-10 bg-[var(--primary)]" />
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] max-w-2xl leading-tight">
        {heading}
      </h2>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [heroScene, setHeroScene] = useState(0)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setHeroScene(v => (v + 1) % 3), 6000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--background)]">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md"
        style={{ background: 'rgba(8,12,16,0.75)' }}
      >
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">

          <Logo light />

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {link}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-white/70 hover:text-white hover:bg-white/10">
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login">Start Free Trial</Link>
            </Button>
          </div>

          <button
            className="md:hidden p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-gray-950 px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map(link => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm text-white/60 hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <Button variant="outline" asChild className="border-white/20 text-white bg-transparent hover:bg-white/10">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Start Free Trial</Link>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: '#080c10' }}
      >
        {/* Full-screen cycling background */}
        <HeroFullBg scene={heroScene} setScene={setHeroScene} />

        {/* Gradient overlay — heavy on the left for text, fades right */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, #080c10 38%, rgba(8,12,16,0.82) 55%, rgba(8,12,16,0.35) 75%, transparent 100%)',
          }}
        />
        {/* Top + bottom fades */}
        <div
          className="absolute top-0 left-0 right-0 h-32 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, #080c10, transparent)' }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-40 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #080c10, transparent)' }}
        />

        {/* Content */}
        <div className="relative z-20 w-full pt-16">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
            <div className="max-w-xl">

              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-green-400">
                For professional photographers
              </span>

              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] text-white">
                Your work<br />
                deserves a{' '}
                <em className="italic text-green-400">premium</em>{' '}
                home.
              </h1>

              <p className="mt-6 text-lg text-white/55 leading-relaxed max-w-md">
                Deliver stunning client galleries, build your portfolio, and run your
                entire studio — all from one beautifully crafted platform.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button size="lg" asChild>
                  <Link href="/login">Start 7-Day Free Trial →</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white hover:border-white/30"
                >
                  <Link href="#features">See Features</Link>
                </Button>
              </div>

              <p className="mt-5 text-xs text-white/35">
                No credit card required · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ───────────────────────────────────────── */}
      <div className="border-t border-b border-[var(--border)] bg-[var(--muted)] py-4">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Trusted by
            </span>
            <div className="flex flex-wrap items-center">
              {TRUST_ITEMS.map((item, i) => (
                <span key={item} className="flex items-center">
                  <span className="text-sm text-[var(--muted-foreground)] px-2">{item}</span>
                  {i < TRUST_ITEMS.length - 1 && (
                    <span className="text-[var(--muted-foreground)] select-none">·</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="What's inside"
            heading="Everything you need to run a world-class studio."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-[var(--border)] p-6 flex flex-col gap-4 hover:border-green-500/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg border border-[var(--border)] bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-[var(--primary)]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section className="py-24 bg-[var(--muted)]">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Getting started"
            heading="Up and running in minutes."
          />
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden"
            style={{ background: 'var(--border)' }}
          >
            {STEPS.map(step => (
              <div
                key={step.num}
                className="bg-[var(--background)] p-8 flex flex-col gap-4"
              >
                <span className="text-7xl font-bold leading-none select-none text-[var(--border)]">
                  {step.num}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{step.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{step.desc}</p>
                </div>
                {step.bullets.length > 0 && (
                  <ul className="flex flex-col gap-1.5 mt-1 list-none p-0 m-0">
                    {step.bullets.map(bullet => (
                      <li key={bullet} className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <span
                          className="w-1 h-1 rounded-full flex-shrink-0"
                          style={{ background: 'var(--primary)' }}
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center gap-4 mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Pricing</span>
            <div className="h-px w-10 bg-[var(--primary)]" />
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] max-w-xl leading-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-[var(--muted-foreground)] max-w-md">
              Start free. Scale as your studio grows. No hidden fees, no commission on your earnings.
            </p>

            {/* Billing toggle */}
            <div className="mt-4 flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--muted)]">
              {(['monthly', 'yearly'] as const).map(b => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    billing === b
                      ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {b === 'monthly' ? 'Monthly' : 'Yearly'}
                  {b === 'yearly' && (
                    <span className="ml-1.5 text-[10px] font-semibold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                      Save 20%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {PLANS.map(plan => {
              const price = billing === 'monthly' ? plan.monthly : plan.yearly
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                    plan.popular
                      ? 'border-green-500 bg-green-500/5 shadow-lg shadow-green-500/10'
                      : 'border-[var(--border)] bg-[var(--card)]'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-green-600 text-white text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="text-base font-bold text-[var(--foreground)]">{plan.name}</h3>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{plan.desc}</p>
                  </div>

                  <div className="mb-1">
                    {price === 0 ? (
                      <span className="text-4xl font-bold text-[var(--foreground)]">Free</span>
                    ) : (
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-bold text-[var(--foreground)]">
                          ₦{price.toLocaleString()}
                        </span>
                        <span className="text-sm text-[var(--muted-foreground)] mb-1.5">/mo</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] mb-6">
                    {price === 0
                      ? 'Free forever'
                      : billing === 'yearly'
                        ? `Billed annually (₦${(price * 12).toLocaleString()}/yr)`
                        : 'Billed monthly'}
                  </p>

                  <button
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-6 ${
                      plan.popular
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'border border-[var(--border)] text-[var(--foreground)] hover:border-green-500/50 hover:text-green-600'
                    }`}
                  >
                    {plan.cta}
                  </button>

                  <div className="border-t border-[var(--border)] pt-5 flex flex-col gap-3">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check size={13} className="text-green-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span className="text-xs text-[var(--muted-foreground)] leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-center text-xs text-[var(--muted-foreground)] mt-8">
            All plans include a 7-day free trial · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--muted)]">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex flex-col items-center text-center gap-4 mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">FAQ</span>
            <div className="h-px w-10 bg-[var(--primary)]" />
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
              Frequently asked questions
            </h2>
          </div>

          <div className="flex flex-col divide-y divide-[var(--border)]">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                >
                  <span className="text-sm font-semibold text-[var(--foreground)] group-hover:text-green-600 transition-colors">
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-300 ${
                      openFaq === i ? 'rotate-180 text-green-600' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? 'max-h-48 pb-5' : 'max-h-0'
                  }`}
                >
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trial CTA ───────────────────────────────────────── */}
      <section className="py-24 border-t border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center text-center gap-8">

          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
              Start today
            </span>
            <div className="h-px w-10 bg-[var(--primary)]" />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-4xl sm:text-5xl font-bold text-[var(--foreground)] leading-tight">
              7 days free.<br />No card. No commitment.
            </h2>
            <p className="text-lg text-[var(--muted-foreground)]">
              Start on the free Starter plan forever, or trial any paid plan for 7 days.<br className="hidden sm:block" />
              From ₦5,000/mo — cancel or switch anytime.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {TRUST_BADGES.map(badge => (
              <div key={badge} className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--primary)' }}
                />
                <span className="text-sm text-[var(--muted-foreground)]">{badge}</span>
              </div>
            ))}
          </div>

          <Button size="lg" asChild className="px-10">
            <Link href="/login">Start Your Free Trial</Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-6">

          <Logo />

          <nav className="flex items-center flex-wrap justify-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map(link => (
              <a
                key={link}
                href="#"
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {link}
              </a>
            ))}
          </nav>

          <span className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
            © 2026 PixVault Technologies
          </span>
        </div>
      </footer>

    </div>
  )
}
