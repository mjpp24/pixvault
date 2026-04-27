export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PhotographerRow = {
  id: string
  full_name: string
  business_name: string | null
  username: string
  email: string
  phone: string | null
  bio: string | null
  profile_photo_url: string | null
  logo_url: string | null
  website: string | null
  instagram: string | null
  currency: string
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  paystack_public_key: string | null
  paystack_secret_key: string | null
  stripe_key: string | null
  watermark_url: string | null
  brand_color: string
  invoice_prefix: string
  invoice_counter: number
  default_tax_rate: number
  default_payment_terms: string | null
  default_invoice_notes: string | null
  default_allow_download: boolean
  default_allow_selection: boolean
  default_max_selections: number | null
  default_gallery_expiry_days: number | null
  onboarding_completed: boolean
  plan_tier: 'starter' | 'creator' | 'pro' | 'studio'
  storage_used_bytes: number
  video_used_seconds: number
  created_at: string
}

export type PhotographerInsert = {
  id: string
  full_name: string
  business_name?: string | null
  username: string
  email: string
  phone?: string | null
  bio?: string | null
  profile_photo_url?: string | null
  logo_url?: string | null
  website?: string | null
  instagram?: string | null
  currency?: string
  bank_name?: string | null
  account_number?: string | null
  account_name?: string | null
  paystack_public_key?: string | null
  paystack_secret_key?: string | null
  stripe_key?: string | null
  watermark_url?: string | null
  brand_color?: string
  invoice_prefix?: string
  invoice_counter?: number
  default_tax_rate?: number
  default_payment_terms?: string | null
  default_invoice_notes?: string | null
  default_allow_download?: boolean
  default_allow_selection?: boolean
  default_max_selections?: number | null
  default_gallery_expiry_days?: number | null
  onboarding_completed?: boolean
  plan_tier?: 'starter' | 'creator' | 'pro' | 'studio'
  storage_used_bytes?: number
  video_used_seconds?: number
  created_at?: string
}

export type PhotographerUpdate = Partial<PhotographerInsert>

export type ClientRow = {
  id: string
  photographer_id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  notes: string | null
  created_at: string
}

export type ClientInsert = {
  id?: string
  photographer_id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  notes?: string | null
  created_at?: string
}

export type GalleryRow = {
  id: string
  photographer_id: string
  client_id: string | null
  title: string
  slug: string
  description: string | null
  cover_photo_url: string | null
  event_date: string | null
  expires_at: string | null
  is_password_protected: boolean
  gallery_password: string | null
  allow_download: boolean
  allow_selection: boolean
  max_selections: number | null
  status: 'draft' | 'published' | 'archived'
  is_locked: boolean
  lock_message: string | null
  lock_amount: number | null
  lock_currency: string
  total_photos: number
  total_videos: number
  views: number
  created_at: string
  cover_style: string | null
  color_theme: string | null
  font_style: string | null
  grid_spacing: string | null
  grid_roundness: string | null
  gallery_layout: string | null
  is_starred: boolean
  gallery_type: 'selection' | 'delivery'
  background_music_url: string | null
}

export type GalleryInsert = {
  id?: string
  photographer_id: string
  client_id?: string | null
  title: string
  slug: string
  description?: string | null
  cover_photo_url?: string | null
  event_date?: string | null
  expires_at?: string | null
  is_password_protected?: boolean
  gallery_password?: string | null
  allow_download?: boolean
  allow_selection?: boolean
  max_selections?: number | null
  status?: 'draft' | 'published' | 'archived'
  is_locked?: boolean
  lock_message?: string | null
  lock_amount?: number | null
  lock_currency?: string
  total_photos?: number
  total_videos?: number
  views?: number
  created_at?: string
  cover_style?: string | null
  color_theme?: string | null
  font_style?: string | null
  grid_spacing?: string | null
  grid_roundness?: string | null
  gallery_layout?: string | null
  is_starred?: boolean
  gallery_type?: 'selection' | 'delivery'
  background_music_url?: string | null
}

export type GalleryMediaRow = {
  id: string
  gallery_id: string
  photographer_id: string
  file_url: string
  thumbnail_url: string | null
  file_name: string
  file_size: number | null
  file_type: 'photo' | 'video'
  mime_type: string | null
  width: number | null
  height: number | null
  duration: number | null
  display_order: number
  is_favorite: boolean
  created_at: string
}

export type GalleryMediaInsert = {
  id?: string
  gallery_id: string
  photographer_id: string
  file_url: string
  thumbnail_url?: string | null
  file_name: string
  file_size?: number | null
  file_type: 'photo' | 'video'
  mime_type?: string | null
  width?: number | null
  height?: number | null
  duration?: number | null
  display_order?: number
  is_favorite?: boolean
  created_at?: string
}

export type SelectionRow = {
  id: string
  gallery_id: string
  media_id: string
  client_email: string
  client_name: string | null
  selected_at: string
  comment: string | null
}

export type SelectionInsert = {
  id?: string
  gallery_id: string
  media_id: string
  client_email: string
  client_name?: string | null
  selected_at?: string
  comment?: string | null
}

export type NotificationRow = {
  id: string
  photographer_id: string
  gallery_id: string | null
  type: 'download' | 'selection' | 'payment' | 'review'
  client_name: string | null
  client_email: string | null
  message: string | null
  is_read: boolean
  metadata: Json | null
  created_at: string
}

export type NotificationInsert = {
  id?: string
  photographer_id: string
  gallery_id?: string | null
  type: 'download' | 'selection' | 'payment' | 'review'
  client_name?: string | null
  client_email?: string | null
  message?: string | null
  is_read?: boolean
  metadata?: Json | null
  created_at?: string
}

export type InvoiceRow = {
  id: string
  photographer_id: string
  client_id: string | null
  gallery_id: string | null
  invoice_number: string
  title: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string | null
  currency: string
  subtotal: number
  discount_type: 'none' | 'percentage' | 'fixed'
  discount_value: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  balance_due: number
  notes: string | null
  terms: string | null
  payment_instructions: string | null
  footer_message: string | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
}

export type InvoiceInsert = {
  id?: string
  photographer_id: string
  client_id?: string | null
  gallery_id?: string | null
  invoice_number: string
  title: string
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date?: string | null
  currency?: string
  subtotal?: number
  discount_type?: 'none' | 'percentage' | 'fixed'
  discount_value?: number
  tax_rate?: number
  tax_amount?: number
  total?: number
  amount_paid?: number
  balance_due?: number
  notes?: string | null
  terms?: string | null
  payment_instructions?: string | null
  footer_message?: string | null
  sent_at?: string | null
  paid_at?: string | null
  created_at?: string
}

export type InvoiceItemRow = {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  display_order: number
}

export type InvoiceItemInsert = {
  id?: string
  invoice_id: string
  description: string
  quantity?: number
  unit_price: number
  total: number
  display_order?: number
}

export type PaymentRow = {
  id: string
  photographer_id: string
  gallery_id: string | null
  invoice_id: string | null
  client_email: string
  client_name: string | null
  amount: number
  currency: string
  payment_method: 'paystack' | 'stripe' | 'bank_transfer' | 'cash' | 'other' | null
  transaction_reference: string | null
  status: 'pending' | 'successful' | 'failed'
  metadata: Json | null
  paid_at: string | null
  created_at: string
}

export type PaymentInsert = {
  id?: string
  photographer_id: string
  gallery_id?: string | null
  invoice_id?: string | null
  client_email: string
  client_name?: string | null
  amount: number
  currency: string
  payment_method?: 'paystack' | 'stripe' | 'bank_transfer' | 'cash' | 'other' | null
  transaction_reference?: string | null
  status?: 'pending' | 'successful' | 'failed'
  metadata?: Json | null
  paid_at?: string | null
  created_at?: string
}

export interface Database {
  public: {
    Tables: {
      photographers: {
        Row: PhotographerRow
        Insert: PhotographerInsert
        Update: PhotographerUpdate
        Relationships: []
      }
      clients: {
        Row: ClientRow
        Insert: ClientInsert
        Update: Partial<ClientInsert>
        Relationships: []
      }
      galleries: {
        Row: GalleryRow
        Insert: GalleryInsert
        Update: Partial<GalleryInsert>
        Relationships: []
      }
      gallery_media: {
        Row: GalleryMediaRow
        Insert: GalleryMediaInsert
        Update: Partial<GalleryMediaInsert>
        Relationships: []
      }
      selections: {
        Row: SelectionRow
        Insert: SelectionInsert
        Update: Partial<SelectionInsert>
        Relationships: []
      }
      notifications: {
        Row: NotificationRow
        Insert: NotificationInsert
        Update: Partial<NotificationInsert>
        Relationships: []
      }
      invoices: {
        Row: InvoiceRow
        Insert: InvoiceInsert
        Update: Partial<InvoiceInsert>
        Relationships: []
      }
      invoice_items: {
        Row: InvoiceItemRow
        Insert: InvoiceItemInsert
        Update: Partial<InvoiceItemInsert>
        Relationships: []
      }
      finance_transactions: {
        Row: FinanceTransactionRow
        Insert: FinanceTransactionInsert
        Update: Partial<FinanceTransactionInsert>
        Relationships: []
      }
      finance_budgets: {
        Row: FinanceBudgetRow
        Insert: FinanceBudgetInsert
        Update: Partial<FinanceBudgetInsert>
        Relationships: []
      }
      finance_custom_categories: {
        Row: FinanceCustomCategoryRow
        Insert: FinanceCustomCategoryInsert
        Update: Partial<FinanceCustomCategoryInsert>
        Relationships: []
      }
      payments: {
        Row: PaymentRow
        Insert: PaymentInsert
        Update: Partial<PaymentInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_next_invoice_number: {
        Args: { photographer_uuid: string }
        Returns: string
      }
      increment_gallery_views: {
        Args: { gallery_slug: string }
        Returns: void
      }
    }
  }
}

export type FinanceTransactionRow = {
  id: string
  photographer_id: string
  type: 'income' | 'expense'
  title: string
  amount: number
  category: string
  date: string
  note: string | null
  source: 'manual' | 'payment_sync'
  payment_id: string | null
  created_at: string
}

export type FinanceTransactionInsert = {
  id?: string
  photographer_id: string
  type: 'income' | 'expense'
  title: string
  amount: number
  category: string
  date: string
  note?: string | null
  source?: 'manual' | 'payment_sync'
  payment_id?: string | null
  created_at?: string
}

export type FinanceBudgetRow = {
  id: string
  photographer_id: string
  category: string
  monthly_limit: number
  created_at: string
}

export type FinanceBudgetInsert = {
  id?: string
  photographer_id: string
  category: string
  monthly_limit: number
  created_at?: string
}

export type FinanceCustomCategoryRow = {
  id: string
  photographer_id: string
  type: 'income' | 'expense'
  label: string
  created_at: string
}

export type FinanceCustomCategoryInsert = {
  id?: string
  photographer_id: string
  type: 'income' | 'expense'
  label: string
  created_at?: string
}

// Convenience type aliases
export type Photographer = PhotographerRow
export type Client = ClientRow
export type Gallery = GalleryRow
export type GalleryMedia = GalleryMediaRow
export type Selection = SelectionRow
export type Notification = NotificationRow
export type Invoice = InvoiceRow
export type InvoiceItem = InvoiceItemRow
export type FinanceTransaction = FinanceTransactionRow
export type FinanceBudget = FinanceBudgetRow
export type FinanceCustomCategory = FinanceCustomCategoryRow
export type Payment = PaymentRow
