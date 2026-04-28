'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ArrowLeft, Save, Send, Eye, Download, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, CURRENCIES } from '@/lib/utils'
import type { Photographer, Client, InvoiceRow, InvoiceItemRow } from '@/types/database'
import { InvoicePreview } from './invoice-preview'

const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description required'),
  quantity: z.number().min(0.01),
  unit_price: z.number().min(0),
  total: z.number(),
  display_order: z.number().optional(),
})

const invoiceSchema = z.object({
  title: z.string().min(1, 'Title required'),
  client_id: z.string().optional(),
  client_name: z.string().optional(),
  client_email: z.string().email().optional().or(z.literal('')),
  client_address: z.string().optional(),
  gallery_id: z.string().optional(),
  invoice_number: z.string().min(1),
  issue_date: z.string().min(1),
  due_date: z.string().optional(),
  currency: z.string(),
  items: z.array(lineItemSchema).min(1, 'At least one line item required'),
  discount_type: z.enum(['none', 'percentage', 'fixed']),
  discount_value: z.number(),
  tax_rate: z.number(),
  amount_paid: z.number(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  footer_message: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

interface InvoiceBuilderProps {
  photographer: Photographer
  clients: Pick<Client, 'id' | 'name' | 'email' | 'address' | 'city' | 'country' | 'phone'>[]
  galleries: { id: string; title: string; status: string }[]
  invoiceNumber: string
  mode: 'create' | 'edit'
  existingInvoice?: InvoiceRow & { invoice_items: InvoiceItemRow[] }
}

export function InvoiceBuilder({
  photographer,
  clients,
  galleries,
  invoiceNumber,
  mode,
  existingInvoice,
}: InvoiceBuilderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const today = new Date().toISOString().split('T')[0]
  const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: existingInvoice ? {
      title: existingInvoice.title,
      client_id: existingInvoice.client_id ?? '',
      gallery_id: existingInvoice.gallery_id ?? '',
      invoice_number: existingInvoice.invoice_number,
      issue_date: existingInvoice.issue_date,
      due_date: existingInvoice.due_date ?? '',
      currency: existingInvoice.currency,
      items: existingInvoice.invoice_items ?? [{ description: '', quantity: 1, unit_price: 0, total: 0, display_order: 0 }],
      discount_type: existingInvoice.discount_type,
      discount_value: existingInvoice.discount_value,
      tax_rate: existingInvoice.tax_rate,
      amount_paid: existingInvoice.amount_paid,
      notes: existingInvoice.notes ?? '',
      terms: existingInvoice.terms ?? photographer.default_payment_terms ?? '',
      footer_message: existingInvoice.footer_message ?? '',
    } : {
      title: '',
      invoice_number: invoiceNumber,
      issue_date: today,
      due_date: defaultDue,
      currency: photographer.currency ?? 'NGN',
      items: [{ description: '', quantity: 1, unit_price: 0, total: 0, display_order: 0 }],
      discount_type: 'none',
      discount_value: 0,
      tax_rate: photographer.default_tax_rate ?? 0,
      amount_paid: 0,
      notes: photographer.default_invoice_notes ?? '',
      terms: photographer.default_payment_terms ?? 'Payment due within 14 days',
      footer_message: 'Thank you for your business!',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedValues = watch()

  // Auto-calculate item totals
  const items = watch('items')
  useEffect(() => {
    items.forEach((item, index) => {
      const total = (item.quantity ?? 0) * (item.unit_price ?? 0)
      setValue(`items.${index}.total`, parseFloat(total.toFixed(2)))
    })
  }, [JSON.stringify(items.map(i => ({ q: i.quantity, p: i.unit_price })))])

  // Auto-fill client details when client selected
  const selectedClientId = watch('client_id')
  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find((c) => c.id === selectedClientId)
      if (client) {
        setValue('client_name', client.name)
        setValue('client_email', client.email)
        setValue('client_address', [client.address, client.city, client.country].filter(Boolean).join(', '))
      }
    }
  }, [selectedClientId])

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + ((item.quantity ?? 0) * (item.unit_price ?? 0)), 0)
  const discountType = watch('discount_type')
  const discountValue = watch('discount_value') ?? 0
  const taxRate = watch('tax_rate') ?? 0
  const amountPaid = watch('amount_paid') ?? 0
  const currency = watch('currency')

  const discountAmount = discountType === 'percentage'
    ? (subtotal * discountValue) / 100
    : discountType === 'fixed' ? discountValue : 0
  const taxableAmount = subtotal - discountAmount
  const taxAmount = (taxableAmount * taxRate) / 100
  const total = taxableAmount + taxAmount
  const balanceDue = total - amountPaid

  // Autosave draft every 30s
  const savedInvoiceId = existingInvoice?.id
  useEffect(() => {
    if (mode !== 'edit') return
    const interval = setInterval(() => {
      // Autosave for edit mode
    }, 30000)
    return () => clearInterval(interval)
  }, [mode, savedInvoiceId])

  const saveInvoice = async (data: InvoiceFormData, sendAfter = false) => {
    setIsSaving(true)
    try {
      const invoicePayload = {
        photographer_id: photographer.id,
        client_id: data.client_id || null,
        gallery_id: data.gallery_id || null,
        invoice_number: data.invoice_number,
        title: data.title,
        status: 'draft' as const,
        issue_date: data.issue_date,
        due_date: data.due_date || null,
        currency: data.currency,
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        tax_rate: data.tax_rate,
        tax_amount: parseFloat(taxAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        amount_paid: data.amount_paid,
        balance_due: parseFloat(balanceDue.toFixed(2)),
        notes: data.notes || null,
        terms: data.terms || null,
        payment_instructions: photographer.bank_name
          ? `Bank: ${photographer.bank_name}\nAccount: ${photographer.account_number}\nName: ${photographer.account_name}`
          : null,
        footer_message: data.footer_message || null,
        sent_at: null,
      }

      let invoiceId: string

      if (mode === 'edit' && existingInvoice) {
        const { error } = await supabase.from('invoices').update(invoicePayload).eq('id', existingInvoice.id)
        if (error) throw error
        invoiceId = existingInvoice.id

        // Delete existing items and re-insert
        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
      } else {
        const { data: newInvoice, error } = await supabase.from('invoices').insert(invoicePayload).select().single()
        if (error) throw error
        invoiceId = newInvoice.id
      }

      // Insert line items
      const itemsPayload = data.items.map((item, i) => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: parseFloat(((item.quantity ?? 0) * (item.unit_price ?? 0)).toFixed(2)),
        display_order: i,
      }))
      const { error: itemsError } = await supabase.from('invoice_items').insert(itemsPayload)
      if (itemsError) throw itemsError

      toast.success(sendAfter ? 'Invoice saved! Choose how to send it below.' : 'Invoice saved as draft')
      router.push(`/invoices/${invoiceId}${sendAfter ? '?send=1' : ''}`)
    } catch (err) {
      toast.error('Failed to save invoice. Please try again.')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const addLineItem = () => {
    append({ description: '', quantity: 1, unit_price: 0, total: 0, display_order: fields.length })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            Invoices
          </Link>
          <h1 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? 'New Invoice' : `Edit ${existingInvoice?.invoice_number}`}
          </h1>
        </div>

        {/* Mobile tabs */}
        <div className="flex lg:hidden bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'edit' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Edit
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'preview' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" loading={isSaving} onClick={handleSubmit((data) => saveInvoice(data, false))}>
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save Draft</span>
          </Button>
          <Button size="sm" loading={isSaving} onClick={handleSubmit((data) => saveInvoice(data, true))}>
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Save & Send</span>
            <span className="sm:hidden">Send</span>
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)] overflow-hidden">
        {/* Left: Form */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-5 ${activeTab === 'preview' ? 'hidden lg:block' : ''}`}>

          {/* Invoice header */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Invoice Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Invoice Number</Label>
                <Input {...register('invoice_number')} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <select className="flex h-10 w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" {...register('currency')}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Invoice Title <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Wedding Photography — Sarah & James" {...register('title')} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Issue Date</Label>
                <Input type="date" {...register('issue_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" {...register('due_date')} />
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Bill To</h2>

            <div className="space-y-1.5">
              <Label>Select Client</Label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                {...register('client_id')}
              >
                <option value="">Select a client or fill in manually</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Client Name</Label>
                <Input placeholder="Full name" {...register('client_name')} />
              </div>
              <div className="space-y-1.5">
                <Label>Client Email</Label>
                <Input type="email" placeholder="email@example.com" {...register('client_email')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Client Address</Label>
              <Input placeholder="Street, City, Country" {...register('client_address')} />
            </div>

            <div className="space-y-1.5">
              <Label>Link to Gallery (optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                {...register('gallery_id')}
              >
                <option value="">No gallery</option>
                {galleries.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400">Lock a gallery until this invoice is paid</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Line Items</h2>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 px-1">
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-3 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1" />
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start group">
                  <div className="col-span-4 min-w-0">
                    <Input
                      placeholder="Service description"
                      {...register(`items.${index}.description`)}
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2 min-w-0">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="text-sm text-right"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="col-span-3 min-w-0">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="text-sm text-right"
                      placeholder="0.00"
                      {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="col-span-2 min-w-0 flex items-center justify-end h-10">
                    <span className="text-xs font-medium text-gray-900 break-all text-right leading-tight">
                      {formatCurrency(
                        (watch(`items.${index}.quantity`) ?? 0) * (watch(`items.${index}.unit_price`) ?? 0),
                        currency
                      )}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end h-10">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Discount</span>
                  <select
                    className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none"
                    {...register('discount_type')}
                  >
                    <option value="none">None</option>
                    <option value="percentage">%</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                {discountType !== 'none' && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 h-8 text-sm text-right"
                      {...register('discount_value')}
                    />
                    <span className="text-sm text-gray-500 font-medium">
                      -{formatCurrency(discountAmount, currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Tax */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Tax Rate</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-16 h-8 text-sm text-right"
                      {...register('tax_rate')}
                    />
                    <span className="text-sm text-gray-400">%</span>
                  </div>
                </div>
                <span className="text-sm text-gray-500">+{formatCurrency(taxAmount, currency)}</span>
              </div>

              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>

              {/* Amount paid */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500">Amount Paid</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-36 h-8 text-sm text-right"
                  {...register('amount_paid')}
                />
              </div>

              <div className={`flex justify-between text-sm font-semibold pt-1 ${balanceDue > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                <span>Balance Due</span>
                <span>{formatCurrency(Math.max(0, balanceDue), currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Notes & Terms</h2>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-[var(--input)] bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] resize-none"
                placeholder="Additional notes for the client..."
                {...register('notes')}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Payment Terms</Label>
              <Input placeholder="e.g. Payment due within 14 days" {...register('terms')} />
            </div>

            {photographer.bank_name && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Payment Instructions (auto-filled from settings)</p>
                <p className="text-xs text-gray-700">
                  {photographer.bank_name} · {photographer.account_number} · {photographer.account_name}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Footer Message</Label>
              <Input placeholder="e.g. Thank you for your business!" {...register('footer_message')} />
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className={`w-[480px] flex-shrink-0 border-l border-gray-100 bg-gray-100 overflow-y-auto p-4 ${activeTab === 'edit' ? 'hidden lg:block' : ''}`}>
          <p className="text-xs font-medium text-gray-400 text-center mb-4 uppercase tracking-wide">Live Preview</p>
          <InvoicePreview
            data={watchedValues}
            photographer={photographer}
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            total={total}
            balanceDue={balanceDue}
          />
        </div>
      </div>
    </div>
  )
}
