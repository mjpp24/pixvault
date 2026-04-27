'use client'

import { useState } from 'react'
import { Star, Trash2, Play, ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { GalleryMedia } from '@/types/database'
import { GalleryLightbox } from './gallery-lightbox'

interface GalleryMediaGridProps {
  media: GalleryMedia[]
  galleryId: string
  coverPhotoUrl?: string | null
}

export function GalleryMediaGrid({ media: initialMedia, galleryId, coverPhotoUrl }: GalleryMediaGridProps) {
  const [media, setMedia] = useState(initialMedia)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [coverPath, setCoverPath] = useState(coverPhotoUrl ?? null)
  const supabase = createClient()
  const router = useRouter()

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('gallery-media').getPublicUrl(path)
    return data.publicUrl
  }

  const toggleFavorite = async (item: GalleryMedia) => {
    const { error } = await supabase
      .from('gallery_media')
      .update({ is_favorite: !item.is_favorite })
      .eq('id', item.id)

    if (!error) {
      setMedia((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, is_favorite: !m.is_favorite } : m))
      )
    }
  }

  const setCoverPhoto = async (item: GalleryMedia) => {
    const url = getPublicUrl(item.file_url)
    const { error } = await supabase
      .from('galleries')
      .update({ cover_photo_url: url })
      .eq('id', galleryId)

    if (!error) {
      setCoverPath(url)
      toast.success('Cover photo updated!')
      router.refresh()
    } else {
      toast.error('Failed to set cover photo')
    }
  }

  const deleteMedia = async (id: string, filePath: string) => {
    if (!confirm('Delete this photo? This cannot be undone.')) return

    await supabase.storage.from('gallery-media').remove([filePath])
    const { error } = await supabase.from('gallery_media').delete().eq('id', id)

    if (!error) {
      setMedia((prev) => prev.filter((m) => m.id !== id))
      toast.success('Photo deleted')
      router.refresh()
    } else {
      toast.error('Failed to delete photo')
    }
  }

  return (
    <>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {media.map((item, index) => {
          const url = getPublicUrl(item.file_url)
          const thumbnail = item.thumbnail_url ? getPublicUrl(item.thumbnail_url) : url

          return (
            <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              {/* Purpose badge */}
              <div className="absolute top-1.5 left-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.is_favorite ? (
                  <span className="text-[9px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded">Selection</span>
                ) : (
                  <span className="text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded">Delivery</span>
                )}
              </div>
              {item.file_type === 'photo' ? (
                <img
                  src={thumbnail}
                  alt={item.file_name}
                  className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => setLightboxIndex(index)}
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center bg-gray-900 cursor-pointer"
                  onClick={() => setLightboxIndex(index)}
                >
                  {thumbnail !== url ? (
                    <img src={thumbnail} alt={item.file_name} className="w-full h-full object-cover opacity-60" />
                  ) : null}
                  <Play className="absolute w-10 h-10 text-white" />
                </div>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all pointer-events-none group-hover:pointer-events-auto">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.file_type === 'photo' && (
                    <button
                      onClick={() => setCoverPhoto(item)}
                      title="Set as cover photo"
                      className={`p-1.5 rounded-lg backdrop-blur-sm transition-colors ${
                        getPublicUrl(item.file_url) === coverPath
                          ? 'bg-green-500 text-white'
                          : 'bg-black/40 text-white hover:bg-green-500'
                      }`}
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleFavorite(item)}
                    className={`p-1.5 rounded-lg backdrop-blur-sm transition-colors ${
                      item.is_favorite
                        ? 'bg-yellow-400 text-white'
                        : 'bg-black/40 text-white hover:bg-yellow-400'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" fill={item.is_favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => deleteMedia(item.id, item.file_url)}
                    className="p-1.5 rounded-lg bg-black/40 text-white hover:bg-red-500 backdrop-blur-sm transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cover photo indicator */}
                {getPublicUrl(item.file_url) === coverPath && (
                  <div className="absolute bottom-2 left-2">
                    <span className="text-[10px] font-semibold bg-green-500 text-white px-1.5 py-0.5 rounded">Cover</span>
                  </div>
                )}

                {item.is_favorite && (
                  <div className="absolute top-2 left-2">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {lightboxIndex !== null && (
        <GalleryLightbox
          media={media}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          getUrl={getPublicUrl}
        />
      )}
    </>
  )
}
