import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckSquare, MessageSquare, Users, Image as ImageIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { SelectionsActionBar } from './selections-action-bar'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function mediaUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/gallery-media/${path}`
}

export default async function GallerySelectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: gallery } = await supabase
    .from('galleries')
    .select('*, clients(name, email)')
    .eq('id', id)
    .eq('photographer_id', user.id)
    .single()

  if (!gallery) notFound()

  const { data: selections } = await supabase
    .from('selections')
    .select('*, gallery_media(id, file_name, thumbnail_url, file_url, file_type)')
    .eq('gallery_id', id)
    .order('selected_at', { ascending: false })

  const byClient = (selections ?? []).reduce((acc: Record<string, any[]>, sel) => {
    const key = sel.client_email
    if (!acc[key]) acc[key] = []
    acc[key].push(sel)
    return acc
  }, {})

  const totalSelections = selections?.length ?? 0
  const totalClients = Object.keys(byClient).length
  const withComments = (selections ?? []).filter((s: any) => s.comment).length

  // Build flat list for action bar
  const allSelected = (selections ?? []).map((s: any) => ({
    id: s.id,
    file_name: s.gallery_media?.file_name ?? '',
    file_url: s.gallery_media?.file_url ? mediaUrl(s.gallery_media.file_url) : '',
    thumbnail_url: s.gallery_media?.thumbnail_url
      ? mediaUrl(s.gallery_media.thumbnail_url)
      : s.gallery_media?.file_url ? mediaUrl(s.gallery_media.file_url) : '',
    comment: s.comment ?? null,
    client_email: s.client_email,
    client_name: s.client_name ?? null,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top nav ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/galleries/${id}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="w-px h-5 bg-gray-200" />
            <h1 className="text-sm font-bold text-gray-900 tracking-wide uppercase">{gallery.title}</h1>
            <span className="text-xs text-gray-400 tracking-widest uppercase hidden sm:block">— Selections</span>
          </div>

          {/* Action bar (client component) */}
          <SelectionsActionBar
            galleryId={id}
            gallerySlug={gallery.slug}
            selections={allSelected}
            totalSelections={totalSelections}
          />
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 flex gap-6">

        {/* ── SIDEBAR ── */}
        <aside className="w-72 flex-shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {/* Cover */}
            <div className="h-36 bg-gray-100 relative overflow-hidden">
              {gallery.cover_photo_url ? (
                <img src={gallery.cover_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            <div className="p-4">
              <p className="font-bold text-gray-900 text-lg leading-tight">{gallery.title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{(gallery as any).clients?.name ?? 'No client assigned'}</p>

              {/* Tab bar */}
              <div className="flex border-b border-gray-100 mt-4 -mx-4 px-4 gap-4">
                <Link href={`/galleries/${id}`} className="flex items-center gap-1.5 pb-3 text-xs font-semibold border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-colors">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Photos
                </Link>
                <button className="flex items-center gap-1.5 pb-3 text-xs font-semibold border-b-2 border-green-600 text-green-600">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Selections
                </button>
              </div>

              {/* Stats */}
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Users className="w-3.5 h-3.5" /> Clients responded
                  </span>
                  <span className="font-bold text-gray-900">{totalClients}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <CheckSquare className="w-3.5 h-3.5" /> Total selected
                  </span>
                  <span className="font-bold text-gray-900">{totalSelections}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <MessageSquare className="w-3.5 h-3.5" /> With notes
                  </span>
                  <span className="font-bold text-amber-600">{withComments}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 flex gap-2">
              <Link
                href={`/g/${gallery.slug}`}
                target="_blank"
                className="flex-1 text-center text-xs border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                View
              </Link>
              <Link
                href={`/galleries/${id}`}
                className="flex-1 text-center text-xs bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Manage
              </Link>
            </div>
          </div>

          {/* Client list */}
          {totalClients > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clients</p>
              </div>
              <div className="divide-y divide-gray-50">
                {Object.entries(byClient).map(([email, sels]) => (
                  <div key={email} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{sels[0].client_name ?? email}</p>
                      <p className="text-xs text-gray-400">{sels.length} photos · {formatDate(sels[0].selected_at)}</p>
                    </div>
                    <span className="bg-green-50 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{sels.length}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 min-w-0">
          {totalClients === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-32 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                <CheckSquare className="w-8 h-8 text-green-300" />
              </div>
              <p className="font-semibold text-gray-700 text-lg">No selections yet</p>
              <p className="text-sm text-gray-400 mt-2 max-w-xs">Share the gallery link with your client so they can select their favourite photos.</p>
              <Link
                href={`/g/${gallery.slug}`}
                target="_blank"
                className="mt-5 text-sm text-green-600 hover:underline font-medium"
              >
                Open client gallery link →
              </Link>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── Table header ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                      <CheckSquare className="w-4.5 h-4.5 text-green-500" style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Selected Files</p>
                      <p className="text-xs text-gray-400">{totalSelections} file{totalSelections !== 1 ? 's' : ''} selected across {totalClients} client{totalClients !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-12">S/N</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Photo</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Filename</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Note</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(selections ?? []).map((sel: any, idx: number) => {
                        const m = sel.gallery_media
                        if (!m) return null
                        const thumbSrc = mediaUrl(m.thumbnail_url ?? m.file_url)
                        const fullSrc  = mediaUrl(m.file_url)
                        return (
                          <tr key={sel.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-3 text-gray-400 text-xs font-mono">{String(idx + 1).padStart(2, '0')}</td>
                            <td className="px-4 py-2">
                              <a href={fullSrc} target="_blank" rel="noopener noreferrer">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200 group-hover:ring-green-300 transition-all">
                                  <img src={thumbSrc} alt={m.file_name} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                              </a>
                            </td>
                            <td className="px-4 py-3">
                              <a
                                href={fullSrc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:underline font-medium text-sm truncate max-w-[240px] block"
                              >
                                {m.file_name}
                              </a>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{sel.client_name ?? '—'}</p>
                                <p className="text-xs text-gray-400">{sel.client_email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {sel.comment ? (
                                <div className="relative group/tooltip">
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium cursor-default">
                                    <MessageSquare className="w-3 h-3" />
                                    Note
                                  </span>
                                  <div className="absolute bottom-full left-0 mb-2 w-52 bg-gray-900 text-white text-xs rounded-xl p-3 hidden group-hover/tooltip:block z-30 shadow-2xl pointer-events-none">
                                    <p className="font-semibold text-amber-400 mb-1 text-[10px] uppercase tracking-wide">Client note</p>
                                    <p className="leading-relaxed">{sel.comment}</p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(sel.selected_at)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination placeholder */}
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <span>Showing {totalSelections} of {totalSelections} items</span>
                  <div className="flex items-center gap-1">
                    <button disabled className="px-2 py-1 rounded border border-gray-200 text-gray-300 cursor-not-allowed">←</button>
                    <span className="px-2 py-1 rounded bg-green-50 text-green-600 font-semibold border border-green-200">1</span>
                    <button disabled className="px-2 py-1 rounded border border-gray-200 text-gray-300 cursor-not-allowed">→</button>
                  </div>
                </div>
              </div>

              {/* Per-client photo grids */}
              {Object.entries(byClient).map(([email, sels]) => {
                const notedSels = sels.filter((s: any) => s.comment)
                const initials = (sels[0].client_name ?? email)[0].toUpperCase()
                return (
                  <div key={email} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-green-600">{initials}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{sels[0].client_name ?? 'Client'}</p>
                          <p className="text-xs text-gray-400">{email} · Submitted {formatDate(sels[0].selected_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {notedSels.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-semibold">
                            <MessageSquare className="w-3 h-3" />
                            {notedSels.length} note{notedSels.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                          {sels.length} photo{sels.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {sels.map((sel: any) => {
                          const m = sel.gallery_media
                          if (!m) return null
                          const url = mediaUrl(m.thumbnail_url ?? m.file_url)
                          return (
                            <div key={sel.id} className="relative group/photo">
                              <a href={mediaUrl(m.file_url)} target="_blank" rel="noopener noreferrer">
                                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200 hover:ring-green-400 transition-all">
                                  <img src={url} alt={m.file_name} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                              </a>
                              <p className="text-[9px] text-gray-400 mt-0.5 truncate text-center leading-tight">{m.file_name}</p>
                              {sel.comment && (
                                <>
                                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow">
                                    <MessageSquare className="w-2.5 h-2.5 text-white" />
                                  </div>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-900 text-white text-xs rounded-xl p-3 hidden group-hover/photo:block z-20 shadow-2xl pointer-events-none">
                                    <p className="font-semibold text-amber-400 mb-1 text-[10px] uppercase tracking-wide">Client note</p>
                                    <p className="leading-relaxed">{sel.comment}</p>
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {notedSels.length > 0 && (
                        <div className="mt-5 border-t border-gray-100 pt-4 space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                            Editing Notes
                          </p>
                          {notedSels.map((sel: any) => (
                            <div key={sel.id} className="flex items-start gap-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                <img src={mediaUrl(sel.gallery_media?.thumbnail_url ?? sel.gallery_media?.file_url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-gray-400 font-medium truncate">{sel.gallery_media?.file_name}</p>
                                <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">{sel.comment}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
