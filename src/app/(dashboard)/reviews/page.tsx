import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Star, MessageSquare, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className="w-4 h-4"
          style={{ fill: s <= rating ? '#f59e0b' : 'transparent', color: s <= rating ? '#f59e0b' : '#d1d5db' }}
        />
      ))}
    </div>
  )
}

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: reviews } = await (supabase.from('reviews' as any) as any)
    .select('*, galleries(id, title, slug)')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false }) as { data: any[] | null }

  const list = reviews ?? []

  const avgRating = list.length
    ? (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1)
    : null

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: list.filter((r) => r.rating === star).length,
  }))

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-400 mt-1">Client reviews from your delivered galleries</p>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-yellow-50 flex items-center justify-center mb-4">
            <Star className="w-8 h-8 text-yellow-400" />
          </div>
          <h3 className="font-semibold text-gray-700 text-lg mb-1">No reviews yet</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            When clients leave a review, they&apos;ll appear here. You can request a review via the notification bell.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Average */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center justify-center">
              <p className="text-5xl font-bold text-gray-900">{avgRating}</p>
              <StarRow rating={Math.round(Number(avgRating))} />
              <p className="text-xs text-gray-400 mt-1">{list.length} review{list.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Distribution */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 col-span-2">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Rating breakdown</p>
              <div className="space-y-2">
                {dist.map(({ star, count }) => (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 w-4">{star}</span>
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-yellow-400 transition-all"
                        style={{ width: list.length ? `${(count / list.length) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Review list */}
          <div className="space-y-3">
            {list.map((review: any) => {
              const gallery = review.galleries
              const clientLabel = review.client_name ?? review.client_email ?? 'Anonymous'
              const ago = (() => {
                try { return formatDistanceToNow(new Date(review.created_at), { addSuffix: true }) } catch { return '' }
              })()

              return (
                <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-green-600">
                        {clientLabel.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-900 text-sm">{clientLabel}</p>
                        {gallery && (
                          <span className="text-xs text-gray-400">· {gallery.title}</span>
                        )}
                        <span className="text-xs text-gray-300">· {ago}</span>
                      </div>
                      <StarRow rating={review.rating} />
                      {review.review_text && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed italic">
                          &ldquo;{review.review_text}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Open showcase */}
                    <Link
                      href={`/reviews/${review.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors flex-shrink-0"
                      style={{ backgroundColor: '#16a34a' }}
                    >
                      <MessageSquare className="w-3 h-3" />
                      Open
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
