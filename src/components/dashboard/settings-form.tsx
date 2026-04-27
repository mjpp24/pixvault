'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CURRENCIES } from '@/lib/utils'
import type { Photographer } from '@/types/database'
import { Upload } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(2),
  business_name: z.string().optional(),
  bio: z.string().max(300).optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  instagram: z.string().optional(),
  currency: z.string(),
  brand_color: z.string(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_name: z.string().optional(),
  paystack_public_key: z.string().optional(),
  paystack_secret_key: z.string().optional(),
  invoice_prefix: z.string().optional(),
  default_tax_rate: z.number().min(0).max(100).optional(),
  default_payment_terms: z.string().optional(),
  default_invoice_notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function SettingsForm({ photographer }: { photographer: Photographer }) {
  const supabase = createClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'brand' | 'payment' | 'invoice'>('profile')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: photographer.full_name,
      business_name: photographer.business_name ?? '',
      bio: photographer.bio ?? '',
      phone: photographer.phone ?? '',
      website: photographer.website ?? '',
      instagram: photographer.instagram ?? '',
      currency: photographer.currency,
      brand_color: photographer.brand_color,
      bank_name: photographer.bank_name ?? '',
      account_number: photographer.account_number ?? '',
      account_name: photographer.account_name ?? '',
      paystack_public_key: photographer.paystack_public_key ?? '',
      paystack_secret_key: photographer.paystack_secret_key ?? '',
      invoice_prefix: photographer.invoice_prefix,
      default_tax_rate: photographer.default_tax_rate,
      default_payment_terms: photographer.default_payment_terms ?? '',
      default_invoice_notes: photographer.default_invoice_notes ?? '',
    },
  })

  const brandColor = watch('brand_color')

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from('photographers').update({
        full_name: data.full_name,
        business_name: data.business_name || null,
        bio: data.bio || null,
        phone: data.phone || null,
        website: data.website || null,
        instagram: data.instagram || null,
        currency: data.currency,
        brand_color: data.brand_color,
        bank_name: data.bank_name || null,
        account_number: data.account_number || null,
        account_name: data.account_name || null,
        paystack_public_key: data.paystack_public_key || null,
        paystack_secret_key: data.paystack_secret_key || null,
        invoice_prefix: data.invoice_prefix || 'INV',
        default_tax_rate: data.default_tax_rate ?? 0,
        default_payment_terms: data.default_payment_terms || null,
        default_invoice_notes: data.default_invoice_notes || null,
      }).eq('id', photographer.id)

      if (error) throw error
      toast.success('Settings saved!')
      router.refresh()
    } catch {
      toast.error('Failed to save settings.')
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'brand', label: 'Brand' },
    { id: 'payment', label: 'Payment' },
    { id: 'invoice', label: 'Invoices' },
  ] as const

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Profile Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input {...register('full_name')} />
            </div>
            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input {...register('business_name')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-[var(--input)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] resize-none"
              maxLength={300}
              {...register('bio')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input type="tel" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input placeholder="@handle" {...register('instagram')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Website</Label>
              <Input placeholder="https://" {...register('website')} />
            </div>
          </div>
        </div>
      )}

      {/* Brand */}
      {activeTab === 'brand' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Brand Settings</h2>
          <div className="space-y-1.5">
            <Label>Default Currency</Label>
            <select className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" {...register('currency')}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Brand Color</Label>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setValue('brand_color', e.target.value, { shouldDirty: true })}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
              />
              <Input
                value={brandColor}
                onChange={(e) => setValue('brand_color', e.target.value, { shouldDirty: true })}
                className="w-36"
                placeholder="#6366f1"
              />
              <div className="flex gap-2">
                {['#6366f1', '#0f172a', '#dc2626', '#d97706', '#16a34a', '#0284c7'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => setValue('brand_color', c, { shouldDirty: true })}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: c,
                      boxShadow: brandColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : '0 0 0 1px rgba(0,0,0,0.12)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* Hidden field so brand_color stays in form state */}
          <input type="hidden" {...register('brand_color')} />
          <div className="p-4 rounded-lg border-2 transition-colors" style={{ borderColor: brandColor + '40', backgroundColor: brandColor + '10' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: brandColor }} />
              <div>
                <p className="text-xs font-medium text-gray-700">{brandColor}</p>
                <p className="text-xs text-gray-400 mt-0.5">This color appears on client gallery buttons, payment modals, and PDF invoices.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment */}
      {activeTab === 'payment' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Bank Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input placeholder="e.g. GTBank" {...register('bank_name')} />
              </div>
              <div className="space-y-1.5">
                <Label>Account Name</Label>
                <Input {...register('account_name')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Account Number</Label>
                <Input placeholder="0123456789" {...register('account_number')} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Paystack Integration</h2>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">Get your API keys from Paystack Dashboard → Settings → API Keys & Webhooks.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Paystack Public Key</Label>
              <Input placeholder="pk_live_..." {...register('paystack_public_key')} />
            </div>
            <div className="space-y-1.5">
              <Label>Paystack Secret Key</Label>
              <Input type="password" placeholder="sk_live_..." {...register('paystack_secret_key')} />
            </div>
          </div>
        </div>
      )}

      {/* Invoice */}
      {activeTab === 'invoice' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Invoice Defaults</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Invoice Number Prefix</Label>
              <Input placeholder="INV" {...register('invoice_prefix')} />
              <p className="text-xs text-gray-400">e.g. INV → INV-001, INV-002...</p>
            </div>
            <div className="space-y-1.5">
              <Label>Default Tax Rate (%)</Label>
              <Input type="number" step="0.01" min="0" max="100" {...register('default_tax_rate')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Default Payment Terms</Label>
            <Input placeholder="e.g. Payment due within 14 days" {...register('default_payment_terms')} />
          </div>
          <div className="space-y-1.5">
            <Label>Default Invoice Notes</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-[var(--input)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] resize-none"
              placeholder="Notes that appear on every invoice..."
              {...register('default_invoice_notes')}
            />
          </div>
        </div>
      )}

      <Button type="submit" loading={isLoading} className="w-full sm:w-auto">
        Save Settings
      </Button>
    </form>
  )
}
