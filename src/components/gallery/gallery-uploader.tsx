'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, X, RefreshCw, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatFileSize, MAX_VIDEO_SIZE, getFileCategory } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import * as tus from 'tus-js-client'

type FileCategory = 'image' | 'raw' | 'video'

interface UploadFile {
  id: string
  file: File
  category: FileCategory
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  preview?: string
}

interface GalleryUploaderProps {
  galleryId: string
  photographerId: string
  galleryType?: 'selection' | 'delivery'
  onUploadComplete?: () => void
}

// Storage limits in bytes per plan tier
const PLAN_LIMITS: Record<string, number> = {
  starter:  5  * 1024 * 1024 * 1024,        // 5 GB
  creator:  50 * 1024 * 1024 * 1024,         // 50 GB
  pro:      200 * 1024 * 1024 * 1024,        // 200 GB
  studio:   1024 * 1024 * 1024 * 1024,       // 1 TB
}

const MAX_CONCURRENT = 10   // true sliding-window pool — keep 10 uploads in flight at all times
const MAX_COMPRESS_CONCURRENT = 4  // compress ahead-of-upload without overwhelming the CPU
const MAX_IMAGE_SIZE_RAW = 500 * 1024 * 1024
// Files < this go via direct XHR (1 round trip). Larger files use TUS resumable.
const DIRECT_UPLOAD_MAX = 49 * 1024 * 1024
const TUS_CHUNK_SIZE    = 50 * 1024 * 1024

// Generate a small thumbnail blob (400px, JPEG 75%) for the admin grid
async function generateThumbnail(file: File): Promise<Blob | null> {
  if (!['image/jpeg', 'image/jpg', 'image/webp', 'image/png'].includes(file.type)) return null
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX_THUMB = 400
      let { width, height } = img
      if (width > height) { height = Math.round((height / width) * MAX_THUMB); width = MAX_THUMB }
      else { width = Math.round((width / height) * MAX_THUMB); height = MAX_THUMB }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.75)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// Only compress standard web images; skip RAW, HEIC, TIFF, videos
async function compressImage(file: File): Promise<File> {
  if (!['image/jpeg', 'image/jpg', 'image/webp', 'image/png'].includes(file.type)) return file
  if (file.size < 2 * 1024 * 1024) return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX_DIM = 4000
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height / width) * MAX_DIM); width = MAX_DIM }
        else { width = Math.round((width / height) * MAX_DIM); height = MAX_DIM }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg', 0.92
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// Direct XHR — single HTTP POST, real progress, no TUS handshake overhead
// Use for files < DIRECT_UPLOAD_MAX (Supabase gateway limit ~50 MB)
function directXhr(
  file: File | Blob,
  storagePath: string,
  token: string,
  supabaseUrl: string,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/gallery-media/${storagePath}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'true')
    xhr.setRequestHeader('Cache-Control', '3600')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed: ${xhr.status}`))
    }
    xhr.onerror  = () => reject(new Error('Network error'))
    xhr.ontimeout = () => reject(new Error('Upload timed out'))
    xhr.send(file)
  })
}

// TUS resumable — required for files >= DIRECT_UPLOAD_MAX (videos, large RAW)
function tusUpload(
  file: File | Blob,
  storagePath: string,
  token: string,
  supabaseUrl: string,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000],
      headers: { Authorization: `Bearer ${token}`, 'x-upsert': 'true' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: TUS_CHUNK_SIZE,
      metadata: {
        bucketName: 'gallery-media',
        objectName: storagePath,
        contentType: contentType || 'application/octet-stream',
        cacheControl: '3600',
      },
      onError: (err) => reject(err),
      onProgress: (uploaded, total) => {
        if (total > 0) onProgress(Math.round((uploaded / total) * 100))
      },
      onSuccess: () => resolve(),
    })
    upload.start()
  })
}

// Unified upload: direct XHR for small/medium files, TUS for large (videos)
function uploadToStorage(
  file: File | Blob,
  storagePath: string,
  token: string,
  supabaseUrl: string,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return file.size < DIRECT_UPLOAD_MAX
    ? directXhr(file, storagePath, token, supabaseUrl, contentType, onProgress)
    : tusUpload(file, storagePath, token, supabaseUrl, contentType, onProgress)
}

export function GalleryUploader({ galleryId, photographerId, galleryType, onUploadComplete }: GalleryUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [panelMinimised, setPanelMinimised] = useState(false)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [showProcessingModal, setShowProcessingModal] = useState(false)
  const globalPurpose = galleryType === 'selection' ? 'selection' : 'delivery'
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  // Auto-dismiss the panel 2.5s after everything finishes
  const allDoneRef = useRef(false)
  useEffect(() => {
    const allFinished = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error')
    if (allFinished && !allDoneRef.current) {
      allDoneRef.current = true
      const t = setTimeout(() => { setFiles([]); allDoneRef.current = false }, 2500)
      return () => clearTimeout(t)
    }
    if (!allFinished) allDoneRef.current = false
  }, [files])

  const checkStorageQuota = useCallback(async (totalNewBytes: number): Promise<boolean> => {
    const { data: photographer } = await supabase
      .from('photographers')
      .select('plan_tier, storage_used_bytes')
      .eq('id', photographerId)
      .single()

    if (!photographer) return true // allow if can't check

    const limit = PLAN_LIMITS[photographer.plan_tier] ?? PLAN_LIMITS.starter
    const used = photographer.storage_used_bytes ?? 0
    const available = limit - used

    if (totalNewBytes > available) {
      const tier = photographer.plan_tier
      setStorageWarning(
        `Not enough storage. You have ${formatFileSize(available)} left on your ${tier} plan.`
      )
      return false
    }
    setStorageWarning(null)
    return true
  }, [supabase, photographerId])

  // Ref always points to the latest runUpload so addFiles can call it without stale closures
  const runUploadRef = useRef<(items: UploadFile[]) => void>(() => {})

  const addFiles = useCallback((newFiles: File[]) => {
    const validated: UploadFile[] = []
    for (const file of newFiles) {
      const category = getFileCategory(file)
      if (category === 'unsupported') {
        toast.error(`${file.name}: Unsupported file type`)
        continue
      }
      const sizeLimit = category === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE_RAW
      if (file.size > sizeLimit) {
        toast.error(`${file.name}: Exceeds ${formatFileSize(sizeLimit)} limit`)
        continue
      }
      validated.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        category,
        status: 'pending',
        progress: 0,
        preview: category === 'image' ? URL.createObjectURL(file) : undefined,
      })
    }
    if (validated.length === 0) return
    setFiles((prev) => [...prev, ...validated])
    runUploadRef.current(validated)
  }, [])

  const setProgress = (id: string, progress: number) =>
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, progress } : f))

  const setStatus = (id: string, status: UploadFile['status'], error?: string) =>
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, status, ...(error ? { error } : {}) } : f))

  const runUpload = async (pending: UploadFile[]) => {
    if (pending.length === 0 || isUploading) return

    const totalBytes = pending.reduce((sum, f) => sum + f.file.size, 0)
    const hasSpace = await checkStorageQuota(totalBytes)
    if (!hasSpace) return

    setIsUploading(true)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // ── Pre-compress images in a parallel pool ahead of uploading ──────────────
    // Compression runs on CPU; uploading blocks on network. Running them together
    // means uploads wait on compression. Instead: compress N files ahead of time
    // so uploads always have ready-to-send data.
    const compressed = new Map<string, File>()
    let compressIdx = 0
    const compressNext = async (): Promise<void> => {
      const idx = compressIdx++
      if (idx >= pending.length) return
      const item = pending[idx]
      const ready = item.category === 'image' ? await compressImage(item.file) : item.file
      compressed.set(item.id, ready)
    }
    // Kick off MAX_COMPRESS_CONCURRENT compression workers
    await Promise.all(Array.from({ length: Math.min(MAX_COMPRESS_CONCURRENT, pending.length) }, compressNext))

    // ── Sliding-window upload pool ──────────────────────────────────────────────
    // Unlike fixed batches, as soon as one slot finishes the next file starts
    // immediately — no dead time waiting for the slowest file in a batch.
    const results: ({ storagePath: string; thumbnailPath: string | null; item: UploadFile } | null)[] = []
    let uploadIdx = 0

    const uploadWorker = async (): Promise<void> => {
      while (true) {
        const idx = uploadIdx++
        if (idx >= pending.length) break
        const item = pending[idx]

        // Ensure this file is compressed before uploading
        if (!compressed.has(item.id)) {
          const ready = item.category === 'image' ? await compressImage(item.file) : item.file
          compressed.set(item.id, ready)
        }

        const ext = item.file.name.split('.').pop() ?? 'bin'
        const storagePath = `${photographerId}/${galleryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const fileToUpload = compressed.get(item.id)!
        const contentType = fileToUpload.type || 'application/octet-stream'

        setStatus(item.id, 'uploading')
        setProgress(item.id, 2)

        try {
          await uploadToStorage(fileToUpload, storagePath, token, supabaseUrl, contentType,
            (pct) => setProgress(item.id, pct))

          // Generate + upload a small thumbnail for instant grid preview
          let thumbnailPath: string | null = null
          if (item.category === 'image') {
            try {
              const thumbBlob = await generateThumbnail(item.file)
              if (thumbBlob) {
                thumbnailPath = storagePath.replace(/\.[^.]+$/, '_thumb.jpg')
                await directXhr(thumbBlob, thumbnailPath, token, supabaseUrl, 'image/jpeg', () => {})
              }
            } catch { /* thumbnail failure never blocks the upload */ }
          }

          setStatus(item.id, 'done')
          setProgress(item.id, 100)
          results.push({ storagePath, thumbnailPath, item })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed'
          setStatus(item.id, 'error', message)
          results.push(null)
        }

        compressed.delete(item.id) // free memory as we go
      }
    }

    // Spawn MAX_CONCURRENT workers — each grabs the next file as soon as it's free
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, pending.length) }, uploadWorker))

    const mediaRows = results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map((r, idx) => ({
        gallery_id: galleryId,
        photographer_id: photographerId,
        file_url: r.storagePath,
        thumbnail_url: r.thumbnailPath ?? null,
        file_name: r.item.file.name,
        file_size: r.item.file.size,
        file_type: (r.item.category === 'video' ? 'video' : 'photo') as 'photo' | 'video',
        mime_type: r.item.file.type || 'application/octet-stream',
        display_order: idx,
      }))

    if (mediaRows.length > 0) {
      const { error: dbError } = await supabase.from('gallery_media').insert(mediaRows)
      if (dbError) {
        toast.error('Files uploaded but failed to save records.')
        console.error(dbError)
      } else {
        const { data: allMedia } = await supabase
          .from('gallery_media').select('file_type').eq('gallery_id', galleryId)
        const photoCount = allMedia?.filter((m) => m.file_type === 'photo').length ?? 0
        const videoCount = allMedia?.filter((m) => m.file_type === 'video').length ?? 0
        await supabase.from('galleries').update({ total_photos: photoCount, total_videos: videoCount }).eq('id', galleryId)
        onUploadComplete?.()
        setShowProcessingModal(true)
      }
    }

    setIsUploading(false)
    router.refresh()
  }

  // Keep ref up-to-date every render so addFiles always calls the latest version
  runUploadRef.current = (items: UploadFile[]) => runUpload(items)

  // Called by retry button — reads from current files state
  const uploadAll = () => runUpload(files.filter((f) => f.status === 'pending' || f.status === 'error'))

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id))

  const doneCount = files.filter((f) => f.status === 'done').length
  const totalCount = files.length
  const pendingCount = files.filter((f) => f.status === 'pending' || f.status === 'error').length
  const overallProgress = totalCount > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / totalCount)
    : 0
  const allDone = totalCount > 0 && files.every((f) => f.status === 'done' || f.status === 'error')

  const neonBar = (pct: number, status: UploadFile['status']) => {
    const color =
      status === 'done'  ? 'linear-gradient(90deg,#34d399,#10b981)' :
      status === 'error' ? 'linear-gradient(90deg,#f87171,#ef4444)' :
      'linear-gradient(90deg,#818cf8,#a78bfa,#22d3ee)'
    const glow =
      status === 'done'  ? '0 0 6px rgba(52,211,153,0.7)' :
      status === 'error' ? '0 0 6px rgba(248,113,113,0.7)' :
      '0 0 8px rgba(129,140,248,0.8),0 0 18px rgba(34,211,238,0.3)'
    return (
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color, boxShadow: pct > 0 ? glow : 'none' }} />
      </div>
    )
  }

  const acceptAttr = [
    'image/*', 'video/*',
    '.nef,.cr2,.cr3,.arw,.dng,.raf,.orf,.rw2,.pef,.srw,.x3f,.raw,.erf,.kdc,.mef,.mrw,.nrw,.3fr',
  ].join(',')

  return (
    <>
      <div className="flex justify-end">
        <div
          className={`relative w-72 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all flex items-center gap-3 ${
            isDragging ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)) }}
          onClick={() => inputRef.current?.click()}
        >
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Upload className="w-4 h-4 text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">Drop files or click to upload</p>
            <p className="text-[10px] text-gray-400">JPG · PNG · HEIC · NEF · ARW · CR2 · MP4 · MOV</p>
          </div>
          {pendingCount > 0 && (
            <span className="ml-auto flex-shrink-0 text-[10px] font-bold bg-green-600 text-white px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={acceptAttr}
            className="hidden"
            onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          />
        </div>
      </div>

      {/* ── Processing complete modal ── */}
      {showProcessingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Files Uploaded Successfully</h2>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Your files have been uploaded and are now being processed.
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Previews may take a moment to appear</span> — this is normal, especially for RAW files (NEF, CR2, ARW) and large videos. They will load automatically once processing is complete.
            </p>
            <p className="text-sm text-gray-400 italic mt-3">
              You can continue setting up your gallery in the meantime.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowProcessingModal(false)}
                className="px-6 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {storageWarning && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {storageWarning}
        </div>
      )}

      {files.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#0e0e1a', border: '1px solid rgba(129,140,248,0.2)' }}>

          <div className="px-4 py-3 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)' }}>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#818cf8' }}>
                File Transfers
              </p>
              <p className="text-sm font-bold text-white leading-tight mt-0.5">
                {allDone ? 'Upload complete' : isUploading ? 'Uploading files…' : 'Ready to upload'}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {doneCount} of {totalCount} processed
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPanelMinimised(v => !v)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <span className="text-xs font-bold">{panelMinimised ? '▲' : '▼'}</span>
              </button>
              <button onClick={() => setFiles([])}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!panelMinimised && (
            <div className="px-4 pb-4 pt-3 space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Overall progress
                  </span>
                  <span className="text-xs font-bold" style={{
                    background: 'linear-gradient(90deg,#818cf8,#22d3ee)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    {overallProgress}%
                  </span>
                </div>
                {neonBar(overallProgress, isUploading ? 'uploading' : allDone ? 'done' : 'pending')}
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'none' }}>
                {files.map((f) => (
                  <div key={f.id} className="rounded-xl p-2.5 space-y-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-white/80 truncate flex-1">{f.file.name}</p>
                      <span className="text-[10px] font-bold flex-shrink-0" style={{
                        color: f.status === 'done' ? '#34d399' : f.status === 'error' ? '#f87171' : '#a78bfa'
                      }}>
                        {f.status === 'done' ? '✓' :
                         f.status === 'error' ? '✗' :
                         f.status === 'uploading' ? `${f.progress}%` :
                         <button onClick={() => removeFile(f.id)} className="text-white/20 hover:text-red-400 transition-colors">
                           <X className="w-3 h-3" />
                         </button>}
                      </span>
                    </div>
                    {neonBar(f.status === 'done' ? 100 : f.status === 'error' ? 100 : f.progress, f.status)}
                    {f.status === 'error' && (
                      <p className="text-[10px] text-red-400 truncate" title={f.error}>{f.error}</p>
                    )}
                  </div>
                ))}
              </div>

              {pendingCount > 0 && !isUploading && (
                <button onClick={uploadAll}
                  className="w-full py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
                  <Upload className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Upload {pendingCount} {pendingCount === 1 ? 'file' : 'files'}
                </button>
              )}
              {isUploading && (
                <div className="flex items-center justify-center gap-2 py-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: '#818cf8' }} />
                  <span className="text-xs font-medium" style={{ color: '#818cf8' }}>Uploading…</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
