'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { toast } from 'sonner'

const schema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})

type FormData = z.infer<typeof schema>

function ResetPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  useEffect(() => {
    // Supabase sends the token in the URL hash (#access_token=...) for password resets.
    // The @supabase/ssr client handles this automatically when the page loads.
    // We just check if we have a valid session.
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
      } else {
        // Try to exchange tokens from URL hash (handled by Supabase JS client internally)
        const { data: listenerData } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' && session) {
            setSessionReady(true)
            listenerData.subscription.unsubscribe()
          }
        })
        // Give it a moment to process the hash
        setTimeout(async () => {
          const { data: { session: sess } } = await supabase.auth.getSession()
          if (sess) {
            setSessionReady(true)
          } else {
            setSessionError(true)
          }
        }, 1500)
      }
    }
    checkSession()
  }, [])

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const passwordValue = watch('password', '')
  const checks = [
    { label: 'At least 8 characters', met: passwordValue.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(passwordValue) },
    { label: 'One number', met: /[0-9]/.test(passwordValue) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(passwordValue) },
  ]

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) {
        toast.error(error.message)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Password updated!</h2>
        <p className="text-gray-500 mt-2 text-sm">Redirecting you to your dashboard…</p>
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Link expired or invalid</h2>
        <p className="text-gray-500 mt-2 text-sm">This password reset link has expired. Please request a new one.</p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm text-green-600 hover:underline">
          Request new reset link →
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
        <p className="text-gray-500 mt-1 text-sm">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="pl-9 pr-9"
              {...register('password')}
              error={errors.password?.message}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* Password strength hints */}
          <div className="grid grid-cols-2 gap-1 mt-2">
            {checks.map((c) => (
              <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.met ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-3 h-3 rounded-full border flex items-center justify-center flex-shrink-0 ${c.met ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {c.met && <span className="text-white text-[8px] font-bold">✓</span>}
                </div>
                {c.label}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              className="pl-9 pr-9"
              {...register('confirm')}
              error={errors.confirm?.message}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirm && <p className="text-xs text-red-500">{errors.confirm.message}</p>}
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          disabled={!sessionReady}
        >
          {!sessionReady ? 'Verifying link…' : 'Update Password'}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
