'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface PayNowButtonProps {
  invoiceId: string
  balanceDue: number
  currency: string
  brandColor: string
  formattedAmount: string
}

export function PayNowButton({
  invoiceId,
  balanceDue,
  currency,
  brandColor,
  formattedAmount,
}: PayNowButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/paystack/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Could not initialize payment')
        return
      }

      // Redirect to Paystack hosted payment page
      window.location.href = data.authorization_url
    } catch {
      toast.error('Payment initialization failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between">
      <div>
        <p className="font-semibold text-gray-900">Balance Due</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: brandColor }}>
          {formattedAmount}
        </p>
      </div>
      <button
        onClick={handlePay}
        disabled={loading}
        className="px-6 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
        style={{ backgroundColor: brandColor }}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Pay Now
      </button>
    </div>
  )
}
