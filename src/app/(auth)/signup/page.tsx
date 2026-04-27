'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Camera, User, Mail, Phone, Building2, AtSign, Lock, Globe, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { slugify } from '@/lib/utils'

const signupSchema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    business_name: z.string().optional(),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens and underscores'),
    email: z.string().email('Please enter a valid email address'),
    phone: z
      .string()
      .min(7, 'Please enter a valid phone number')
      .regex(/^\+?[0-9\s\-().]+$/, 'Please enter a valid phone number'),
    country: z.string().min(1, 'Please select your country'),
    city: z.string().min(2, 'Please enter your city'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type SignupFormData = z.infer<typeof signupSchema>

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'BJ', name: 'Benin Republic', currency: 'XOF' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'OTHER', name: 'Other', currency: 'USD' },
]

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const fullName = watch('full_name')
  const businessName = watch('business_name')

  // Auto-suggest username from name
  const handleNameBlur = () => {
    const current = watch('username')
    if (!current && fullName) {
      const suggested = slugify(businessName || fullName).replace(/\s+/g, '')
      setValue('username', suggested.substring(0, 30))
    }
  }

  const handleNextStep = async () => {
    const step1Fields: (keyof SignupFormData)[] = ['full_name', 'business_name', 'username', 'email', 'phone', 'country', 'city']
    const valid = await trigger(step1Fields)
    if (valid) setCurrentStep(2)
  }

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            username: data.username,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('An account with this email already exists. Please sign in.')
        } else {
          toast.error(authError.message)
        }
        return
      }

      if (!authData.user) {
        toast.error('Something went wrong. Please try again.')
        return
      }

      // Create photographer profile via API (uses service role to bypass RLS)
      const selectedCountry = COUNTRIES.find((c) => c.code === data.country)
      const profileRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          full_name: data.full_name,
          business_name: data.business_name || null,
          username: data.username,
          email: data.email,
          phone: data.phone,
          currency: selectedCountry?.currency ?? 'NGN',
        }),
      })

      if (!profileRes.ok) {
        const profileError = await profileRes.json()
        if (profileError.error === 'username_taken') {
          toast.error('Username is already taken. Please choose a different username.')
          setCurrentStep(1)
        } else {
          toast.error('Failed to create your profile. Please try again.')
        }
        return
      }

      toast.success('Account created! Let\'s set up your profile.')
      router.push('/onboarding')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    })
    if (error) toast.error(error.message)
  }

  const handleGuestAccess = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error || !data.user) {
        toast.error('Guest access unavailable. Please create an account.')
        return
      }
      const guestId = data.user.id.slice(0, 8)
      await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          full_name: 'Guest User',
          username: `guest_${guestId}`,
          email: '',
          currency: 'NGN',
          onboarding_completed: true,
        }),
      })
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Join thousands of photographers delivering stunning galleries
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mt-5">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep >= 1 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>1</div>
            <span className={`text-xs font-medium ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>Personal Info</span>
          </div>
          <div className={`flex-1 h-px ${currentStep >= 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep >= 2 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
            <span className={`text-xs font-medium ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>Security</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {currentStep === 1 && (
          <>
            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Full Name + Business Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    className="pl-9"
                    error={errors.full_name?.message}
                    {...register('full_name', { onBlur: handleNameBlur })}
                  />
                </div>
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="business_name">Business Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="business_name"
                    placeholder="Your Studio"
                    className="pl-9"
                    {...register('business_name', { onBlur: handleNameBlur })}
                  />
                </div>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username">
                Username <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1 text-xs">(your gallery URL)</span>
              </Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  placeholder="johnphotos"
                  className="pl-9"
                  error={errors.username?.message}
                  {...register('username', {
                    onChange: (e) => {
                      e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                    },
                  })}
                />
              </div>
              {errors.username ? (
                <p className="text-xs text-red-500">{errors.username.message}</p>
              ) : (
                <p className="text-xs text-gray-400">
                  pixvault.io/g/<span className="text-green-600 font-medium">{watch('username') || 'yourname'}</span>/gallery-name
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="pl-9"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+234 801 234 5678"
                  className="pl-9"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            {/* Country + City */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <select
                    id="country"
                    className="flex h-10 w-full rounded-md border border-[var(--input)] bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] appearance-none"
                    {...register('country')}
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {errors.country && <p className="text-xs text-red-500">{errors.country.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="city"
                    placeholder="Lagos"
                    className="pl-9"
                    error={errors.city?.message}
                    {...register('city')}
                  />
                </div>
                {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
              </div>
            </div>

            <Button type="button" className="w-full" onClick={handleNextStep}>
              Continue
            </Button>
          </>
        )}

        {currentStep === 2 && (
          <>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to personal info
            </button>

            <div className="p-4 rounded-lg bg-green-50 border border-green-100 mb-2">
              <p className="text-sm text-green-700 font-medium">{watch('full_name')}</p>
              <p className="text-xs text-green-500">{watch('email')} · @{watch('username')}</p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  className="pl-9 pr-10"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirm Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirm_password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  className="pl-9 pr-10"
                  error={errors.confirm_password?.message}
                  {...register('confirm_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-xs text-red-500">{errors.confirm_password.message}</p>
              )}
            </div>

            {/* Password strength hints */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '8+ characters', met: (watch('password') || '').length >= 8 },
                { label: 'Uppercase letter', met: /[A-Z]/.test(watch('password') || '') },
                { label: 'Number', met: /[0-9]/.test(watch('password') || '') },
                { label: 'Passwords match', met: watch('password') === watch('confirm_password') && !!watch('confirm_password') },
              ].map((hint) => (
                <div key={hint.label} className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hint.met ? 'bg-green-500' : 'bg-gray-200'}`}>
                    {hint.met && (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs ${hint.met ? 'text-green-600' : 'text-gray-400'}`}>{hint.label}</span>
                </div>
              ))}
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-400">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-green-600 hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-green-600 hover:underline">Privacy Policy</Link>.
            </p>

            <Button type="submit" className="w-full" loading={isLoading}>
              {isLoading ? 'Creating your account...' : 'Create Account'}
            </Button>
          </>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-green-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <button
        type="button"
        onClick={handleGuestAccess}
        disabled={isLoading}
        className="mt-4 w-full text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
      >
        Explore without signing up →
      </button>
    </div>
  )
}
