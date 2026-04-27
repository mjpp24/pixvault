import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

interface Props {
  searchParams: Promise<{ reference?: string; invoice_id?: string; trxref?: string }>
}

export default async function PaymentCallbackPage({ searchParams }: Props) {
  const { reference, invoice_id, trxref } = await searchParams
  const ref = reference ?? trxref

  if (!ref) redirect('/')

  const supabase = await createClient()

  // Look up payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_reference', ref)
    .single()

  if (!payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Payment Not Found</h1>
          <p className="text-gray-500 text-sm mt-2">We couldn&apos;t find a record for this transaction.</p>
        </div>
      </div>
    )
  }

  // If still pending, verify with Paystack
  let isSuccessful = payment.status === 'successful'

  if (!isSuccessful) {
    const { data: photographer } = await supabase
      .from('photographers')
      .select('paystack_secret_key')
      .eq('id', payment.photographer_id)
      .single()

    if (photographer?.paystack_secret_key) {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
        headers: { Authorization: `Bearer ${photographer.paystack_secret_key}` },
        cache: 'no-store',
      })
      const verifyData = await verifyRes.json()

      if (verifyData.data?.status === 'success') {
        isSuccessful = true

        // Mark payment
        await supabase.from('payments').update({
          status: 'successful',
          paid_at: new Date().toISOString(),
          metadata: verifyData.data,
        }).eq('transaction_reference', ref)

        // Mark invoice
        if (payment.invoice_id) {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('total')
            .eq('id', payment.invoice_id)
            .single()

          if (invoice) {
            await supabase.from('invoices').update({
              status: 'paid',
              amount_paid: invoice.total,
              balance_due: 0,
              paid_at: new Date().toISOString(),
            }).eq('id', payment.invoice_id)
          }
        }

        // Unlock gallery
        if (payment.gallery_id) {
          await supabase.from('galleries').update({ is_locked: false }).eq('id', payment.gallery_id)
        }
      }
    }
  }

  // Get gallery slug for redirect link
  let gallerySlug = ''
  if (payment.gallery_id) {
    const { data: gallery } = await supabase
      .from('galleries')
      .select('slug')
      .eq('id', payment.gallery_id)
      .single()
    gallerySlug = gallery?.slug ?? ''
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
        {isSuccessful ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Payment Successful!</h1>
            <p className="text-gray-500 text-sm mt-2">
              Your payment of{' '}
              <span className="font-semibold text-gray-900">
                {payment.currency} {payment.amount.toLocaleString()}
              </span>{' '}
              has been received.
            </p>

            {gallerySlug && (
              <div className="mt-6 p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-green-800 font-medium">Your gallery is now unlocked!</p>
                <Link
                  href={`/g/${gallerySlug}`}
                  className="mt-3 inline-block px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  View Your Gallery →
                </Link>
              </div>
            )}

            {payment.invoice_id && (
              <div className="mt-4">
                <Link
                  href={`/invoice/${payment.invoice_id}`}
                  className="text-sm text-green-600 hover:underline"
                >
                  View Invoice Receipt →
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Payment Incomplete</h1>
            <p className="text-gray-500 text-sm mt-2">
              Your payment could not be verified. Please try again or contact your photographer.
            </p>
            {payment.invoice_id && (
              <div className="mt-6">
                <Link
                  href={`/invoice/${payment.invoice_id}`}
                  className="inline-block px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  Try Again
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
