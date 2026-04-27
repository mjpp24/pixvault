'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, Palette, CreditCard, CheckCircle, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CURRENCIES } from '@/lib/utils'

const STEPS = [
  { id: 1, title: 'Business Profile', icon: '👤', desc: 'Complete your profile' },
  { id: 2, title: 'Brand & Logo', icon: '🎨', desc: 'Customize your look' },
  { id: 3, title: 'Payment Setup', icon: '💳', desc: 'Connect payments' },
]

const step1Schema = z.object({
  business_name: z.string().optional(),
  bio: z.string().max(300, 'Bio must be under 300 characters').optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  instagram: z.string().optional(),
  currency: z.string().min(1, 'Please select a currency'),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_name: z.string().optional(),
})

const step3Schema = z.object({
  paystack_public_key: z.string().optional(),
  paystack_secret_key: z.string().optional(),
})

type Step1Data = z.infer<typeof step1Schema>
type Step3Data = z.infer<typeof step3Schema>

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [brandColor, setBrandColor] = useState('#6366f1')
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const step1Form = useForm<Step1Data>({ resolver: zodResolver(step1Schema), defaultValues: { currency: 'NGN' } })
  const step3Form = useForm<Step3Data>({ resolver: zodResolver(step3Schema) })

  // Ensures a photographer record exists — handles cases where signup profile creation failed
  const ensurePhotographerRecord = async (userId: string, userMeta: Record<string, string>) => {
    const { data: existing } = await supabase.from('photographers').select('id').eq('id', userId).single()
    if (!existing) {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          full_name: userMeta.full_name ?? 'Photographer',
          username: userMeta.username ?? `user_${userId.slice(0, 8)}`,
          email: userMeta.email ?? '',
          currency: 'NGN',
        }),
      })
      if (!res.ok) throw new Error('Failed to create profile')
    }
  }

  const handleFileSelect = (
    file: File,
    type: 'profile' | 'logo'
  ) => {
    const url = URL.createObjectURL(file)
    if (type === 'profile') {
      setProfilePhotoFile(file)
      setProfilePhotoPreview(url)
    } else {
      setLogoFile(file)
      setLogoPreview(url)
    }
  }

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const uploadPromise = supabase.storage
        .from('photographer-assets')
        .upload(path, file, { upsert: true })
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 12000)
      )
      const { data, error } = await Promise.race([uploadPromise, timeoutPromise])
      if (error || !data) return null
      const { data: urlData } = supabase.storage.from('photographer-assets').getPublicUrl(data.path)
      return urlData.publicUrl
    } catch {
      return null
    }
  }

  const handleStep1 = async (data: Step1Data) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      await ensurePhotographerRecord(user.id, user.user_metadata as Record<string, string>)

      const { error } = await supabase.from('photographers').update({
        business_name: data.business_name || null,
        bio: data.bio || null,
        website: data.website || null,
        instagram: data.instagram || null,
        currency: data.currency,
        bank_name: data.bank_name || null,
        account_number: data.account_number || null,
        account_name: data.account_name || null,
      }).eq('id', user.id)
      if (error) throw error
      setStep(2)
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStep2 = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Upload files in parallel, each with a 12s timeout — failures are silent
      const [profile_photo_url, logo_url] = await Promise.all([
        profilePhotoFile ? uploadFile(profilePhotoFile, `${user.id}/profile-photo`) : Promise.resolve(null),
        logoFile ? uploadFile(logoFile, `${user.id}/logo`) : Promise.resolve(null),
      ])

      // Save brand color (and photo URLs if uploads succeeded) — always advance to step 3
      await supabase.from('photographers').update({
        brand_color: brandColor,
        ...(profile_photo_url ? { profile_photo_url } : {}),
        ...(logo_url ? { logo_url } : {}),
      }).eq('id', user.id)

      setStep(3)
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStep3 = async (data: Step3Data) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      await supabase.from('photographers').update({
        paystack_public_key: data.paystack_public_key || null,
        paystack_secret_key: data.paystack_secret_key || null,
        onboarding_completed: true,
      }).eq('id', user.id)

      toast.success('Profile setup complete! Welcome to PixVault.')
      router.push('/dashboard')
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const skipStep3 = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await ensurePhotographerRecord(user.id, user.user_metadata as Record<string, string>)
      await supabase.from('photographers').update({ onboarding_completed: true }).eq('id', user.id)
      toast.success('Welcome to PixVault! You can add payment details in Settings anytime.')
      router.push('/dashboard')
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">PixVault</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Let&apos;s set up your account</h1>
          <p className="text-gray-500 text-sm mt-1">Just a few steps to get you started</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                  step > s.id
                    ? 'bg-green-500'
                    : step === s.id
                    ? 'bg-green-600'
                    : 'bg-gray-200'
                }`}>
                  {step > s.id ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <span>{s.icon}</span>
                  )}
                </div>
                <p className={`text-xs mt-1.5 font-medium text-center ${step >= s.id ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s.title}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 mb-4 ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* ---- STEP 1: Business Profile ---- */}
          {step === 1 && (
            <form onSubmit={step1Form.handleSubmit(handleStep1)} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Business Profile</h2>
                <p className="text-sm text-gray-500 mt-0.5">Tell clients a bit about yourself</p>
              </div>

              <div className="space-y-1.5">
                <Label>Business / Studio Name</Label>
                <Input placeholder="e.g. Capture Studios" {...step1Form.register('business_name')} />
              </div>

              <div className="space-y-1.5">
                <Label>Bio <span className="text-gray-400 font-normal text-xs">(shown on your galleries)</span></Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] resize-none"
                  placeholder="I'm a Lagos-based wedding and portrait photographer..."
                  maxLength={300}
                  {...step1Form.register('bio')}
                />
                <p className="text-xs text-gray-400 text-right">{step1Form.watch('bio')?.length ?? 0}/300</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input placeholder="https://yoursite.com" {...step1Form.register('website')} />
                  {step1Form.formState.errors.website && (
                    <p className="text-xs text-red-500">{step1Form.formState.errors.website.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram Handle</Label>
                  <Input placeholder="@yourhandle" {...step1Form.register('instagram')} />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium text-gray-900">Currency & Bank Details</p>

                <div className="space-y-1.5">
                  <Label>Default Currency <span className="text-red-500">*</span></Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-[var(--input)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    {...step1Form.register('currency')}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} — {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Bank Name</Label>
                    <Input placeholder="e.g. GTBank" {...step1Form.register('bank_name')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account Name</Label>
                    <Input placeholder="Account name" {...step1Form.register('account_name')} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Account Number</Label>
                  <Input placeholder="0123456789" {...step1Form.register('account_number')} />
                </div>
              </div>

              <Button type="submit" className="w-full" loading={isLoading}>
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* ---- STEP 2: Brand & Logo ---- */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Brand & Logo</h2>
                <p className="text-sm text-gray-500 mt-0.5">Personalize your galleries and invoices</p>
              </div>

              {/* Profile Photo */}
              <div className="space-y-2">
                <Label>Profile Photo</Label>
                <div
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-green-400 transition-colors"
                  onClick={() => document.getElementById('profile-upload')?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {profilePhotoPreview ? (
                      <img src={profilePhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Click to upload profile photo</p>
                    <p className="text-xs text-gray-400">JPG, PNG or WEBP, max 5MB</p>
                  </div>
                </div>
                <input
                  id="profile-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'profile')}
                />
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label>Business Logo</Label>
                <div
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-green-400 transition-colors"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <div className="w-16 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Click to upload your logo</p>
                    <p className="text-xs text-gray-400">PNG with transparent background recommended</p>
                  </div>
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'logo')}
                />
              </div>

              {/* Brand Color */}
              <div className="space-y-2">
                <Label>Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#6366f1"
                    className="w-36"
                  />
                  <div className="flex gap-2">
                    {['#6366f1', '#0f172a', '#dc2626', '#d97706', '#16a34a', '#0284c7'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBrandColor(color)}
                        className="w-7 h-7 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: color,
                          borderColor: brandColor === color ? '#000' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400">Used as accent color in your client galleries and invoices</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" loading={isLoading} onClick={handleStep2}>
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ---- STEP 3: Payment Setup ---- */}
          {step === 3 && (
            <form onSubmit={step3Form.handleSubmit(handleStep3)} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Payment Setup</h2>
                <p className="text-sm text-gray-500 mt-0.5">Connect Paystack to collect payments from clients</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-sm text-blue-800 font-medium">🔑 Where to find your Paystack keys</p>
                <p className="text-xs text-blue-600 mt-1">
                  Log in to your Paystack dashboard → Settings → API Keys & Webhooks.
                  Use your <strong>Test keys</strong> for testing, <strong>Live keys</strong> for real payments.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Paystack Public Key</Label>
                <Input
                  placeholder="pk_live_xxxxxxxxxxxxxx or pk_test_xxxxxxxxxxxxxx"
                  {...step3Form.register('paystack_public_key')}
                />
                <p className="text-xs text-gray-400">This is shown to clients to initialize payments</p>
              </div>

              <div className="space-y-1.5">
                <Label>Paystack Secret Key</Label>
                <Input
                  type="password"
                  placeholder="sk_live_xxxxxxxxxxxxxx or sk_test_xxxxxxxxxxxxxx"
                  {...step3Form.register('paystack_secret_key')}
                />
                <p className="text-xs text-gray-400">Kept secret — never shown to clients</p>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" loading={isLoading}>
                  Finish Setup
                </Button>
              </div>

              <button
                type="button"
                onClick={skipStep3}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip for now — I&apos;ll add payment details later
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
