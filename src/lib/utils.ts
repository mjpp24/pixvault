import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CURRENCIES = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', locale: 'en-GH' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc (Benin)', locale: 'fr-BJ' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc (Cameroon)', locale: 'fr-CM' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-EU' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export function formatCurrency(amount: number, currency: string): string {
  const curr = CURRENCIES.find((c) => c.code === currency)
  if (!curr) return `${currency} ${amount.toFixed(2)}`

  try {
    return new Intl.NumberFormat(curr.locale, {
      style: 'currency',
      currency: curr.code,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${curr.symbol}${amount.toFixed(2)}`
  }
}

export function getCurrencySymbol(currency: string): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function generateGallerySlug(title: string): string {
  const base = slugify(title)
  const random = Math.random().toString(36).substring(2, 7)
  return `${base}-${random}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(date))
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/')
}

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/tiff',
]

// Camera RAW extensions — browsers report these as application/octet-stream or blank
export const RAW_EXTENSIONS = new Set([
  'nef', 'cr2', 'cr3', 'arw', 'dng', 'raf', 'orf', 'rw2', 'pef', 'srw',
  'x3f', 'raw', 'erf', 'kdc', 'mef', 'mrw', 'nrw', '3fr', 'rwl', 'srf',
])

export const VIDEO_EXTENSIONS = new Set([
  'mp4', 'mov', 'avi', 'webm', 'mkv', '3gp', 'mpeg', 'mpg', 'm4v',
  'wmv', 'mts', 'm2ts', 'flv', 'ogv', 'mxf', 'f4v',
])

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi',
  'video/webm', 'video/x-matroska', 'video/mpeg', 'video/3gpp',
  'video/x-ms-wmv', 'video/mts', 'video/m2ts',
]

export const MAX_IMAGE_SIZE = 500 * 1024 * 1024 // 500MB (covers large RAW files)
export const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export function getFileCategory(file: File): 'image' | 'raw' | 'video' | 'unsupported' {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mime = file.type.toLowerCase()
  if (RAW_EXTENSIONS.has(ext)) return 'raw'
  if (VIDEO_EXTENSIONS.has(ext) || mime.startsWith('video/')) return 'video'
  if (SUPPORTED_IMAGE_TYPES.includes(mime) || mime.startsWith('image/')) return 'image'
  return 'unsupported'
}
