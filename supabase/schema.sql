-- PixVault Database Schema
-- Run this in Supabase SQL Editor

-- Photographers (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS photographers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  business_name TEXT,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  profile_photo_url TEXT,
  logo_url TEXT,
  website TEXT,
  instagram TEXT,
  currency TEXT DEFAULT 'NGN',
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  paystack_public_key TEXT,
  paystack_secret_key TEXT,
  stripe_key TEXT,
  watermark_url TEXT,
  brand_color TEXT DEFAULT '#6366f1',
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_counter INTEGER DEFAULT 1,
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  default_payment_terms TEXT DEFAULT 'Payment due within 14 days',
  default_invoice_notes TEXT,
  default_allow_download BOOLEAN DEFAULT TRUE,
  default_allow_selection BOOLEAN DEFAULT TRUE,
  default_max_selections INTEGER,
  default_gallery_expiry_days INTEGER DEFAULT 30,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID REFERENCES photographers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Galleries
CREATE TABLE IF NOT EXISTS galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID REFERENCES photographers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  event_date DATE,
  expires_at TIMESTAMPTZ,
  is_password_protected BOOLEAN DEFAULT FALSE,
  gallery_password TEXT,
  allow_download BOOLEAN DEFAULT TRUE,
  allow_selection BOOLEAN DEFAULT TRUE,
  max_selections INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_locked BOOLEAN DEFAULT FALSE,
  lock_message TEXT DEFAULT 'Please complete your payment to access your gallery.',
  lock_amount DECIMAL(12,2),
  lock_currency TEXT DEFAULT 'NGN',
  total_photos INTEGER DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photographer_id, slug)
);

-- Gallery Media (photos and videos)
CREATE TABLE IF NOT EXISTS gallery_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE,
  photographer_id UUID REFERENCES photographers(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT CHECK (file_type IN ('photo', 'video')),
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  display_order INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Photo Selections
CREATE TABLE IF NOT EXISTS selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE,
  media_id UUID REFERENCES gallery_media(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_name TEXT,
  comment TEXT,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gallery_id, media_id, client_email)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID REFERENCES photographers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT DEFAULT 'NGN',
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount_type TEXT DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed')),
  discount_value DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  payment_instructions TEXT,
  footer_message TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  display_order INTEGER DEFAULT 0
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID REFERENCES photographers(id) ON DELETE CASCADE,
  gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  client_email TEXT NOT NULL,
  client_name TEXT,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('paystack', 'stripe', 'bank_transfer', 'cash', 'other')),
  transaction_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed')),
  metadata JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Photographers: can only access own profile
CREATE POLICY "Photographers can view own profile" ON photographers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Photographers can update own profile" ON photographers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Photographers can insert own profile" ON photographers FOR INSERT WITH CHECK (auth.uid() = id);

-- Clients: photographers access their own clients
CREATE POLICY "Photographers access own clients" ON clients FOR ALL USING (photographer_id = auth.uid());

-- Galleries: photographers access their own galleries
CREATE POLICY "Photographers access own galleries" ON galleries FOR ALL USING (photographer_id = auth.uid());

-- Public gallery read (for client gallery view)
CREATE POLICY "Public can read published galleries" ON galleries FOR SELECT USING (status = 'published');

-- Gallery Media: photographers access own media
CREATE POLICY "Photographers access own media" ON gallery_media FOR ALL USING (photographer_id = auth.uid());

-- Public gallery media read
CREATE POLICY "Public can read gallery media" ON gallery_media FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM galleries WHERE galleries.id = gallery_media.gallery_id AND galleries.status = 'published'
  )
);

-- Selections: photographers read, anyone can insert
CREATE POLICY "Photographers read own gallery selections" ON selections FOR SELECT USING (
  EXISTS (SELECT 1 FROM galleries WHERE galleries.id = selections.gallery_id AND galleries.photographer_id = auth.uid())
);
CREATE POLICY "Anyone can insert selections" ON selections FOR INSERT WITH CHECK (true);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID REFERENCES photographers(id) ON DELETE CASCADE,
  gallery_id      UUID REFERENCES galleries(id) ON DELETE SET NULL,
  client_name     TEXT,
  client_email    TEXT,
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Photographers read own reviews" ON reviews FOR SELECT USING (photographer_id = auth.uid());
CREATE POLICY "Anyone can update their own selections" ON selections FOR UPDATE USING (true) WITH CHECK (true);

-- Invoices: photographers access own invoices
CREATE POLICY "Photographers access own invoices" ON invoices FOR ALL USING (photographer_id = auth.uid());

-- Public invoice read (for client invoice view)
CREATE POLICY "Public can read invoices by id" ON invoices FOR SELECT USING (true);

-- Invoice items follow invoice access
CREATE POLICY "Photographers access own invoice items" ON invoice_items FOR ALL USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.photographer_id = auth.uid())
);
CREATE POLICY "Public can read invoice items" ON invoice_items FOR SELECT USING (true);

-- Payments
CREATE POLICY "Photographers access own payments" ON payments FOR ALL USING (photographer_id = auth.uid());
CREATE POLICY "Anyone can insert payments" ON payments FOR INSERT WITH CHECK (true);

-- =====================
-- STORAGE BUCKETS (run these or create in dashboard)
-- =====================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-media', 'gallery-media', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-thumbnails', 'gallery-thumbnails', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photographer-assets', 'photographer-assets', true);

-- Finance Transactions
CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  title TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own finance transactions"
  ON finance_transactions FOR ALL
  USING (auth.uid() = photographer_id) WITH CHECK (auth.uid() = photographer_id);

-- Finance Budgets
CREATE TABLE IF NOT EXISTS finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit DECIMAL(12,2) NOT NULL CHECK (monthly_limit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(photographer_id, category)
);
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own finance budgets"
  ON finance_budgets FOR ALL
  USING (auth.uid() = photographer_id) WITH CHECK (auth.uid() = photographer_id);

-- =====================
-- FUNCTIONS
-- =====================

-- Auto-increment invoice counter per photographer
CREATE OR REPLACE FUNCTION get_next_invoice_number(photographer_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  counter INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT invoice_prefix, invoice_counter INTO prefix, counter
  FROM photographers WHERE id = photographer_uuid;

  invoice_num := prefix || '-' || LPAD(counter::TEXT, 3, '0');

  UPDATE photographers SET invoice_counter = invoice_counter + 1 WHERE id = photographer_uuid;

  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- PLAN & STORAGE TRACKING
-- =====================

-- Add plan tier and storage tracking to photographers
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan_tier IN ('starter', 'creator', 'pro', 'studio')),
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_used_seconds INTEGER NOT NULL DEFAULT 0;

-- Storage limits per plan (in bytes)
-- starter:  5 GB  =  5_368_709_120
-- creator: 50 GB  = 53_687_091_200
-- pro:    200 GB  = 214_748_364_800
-- studio:   1 TB  = 1_099_511_627_776

-- =====================
-- NOTIFICATIONS
-- =====================

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers manage own notifications"
  ON notifications FOR ALL
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Anyone can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Index for fast unread count lookups
CREATE INDEX IF NOT EXISTS idx_notifications_photographer_unread
  ON notifications (photographer_id, is_read)
  WHERE is_read = FALSE;

-- =====================
-- STORAGE BUCKET POLICIES
-- =====================

-- gallery-media bucket: authenticated upload, public read by gallery owners
-- Run these in Supabase dashboard → Storage → Policies if not already set:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-media', 'gallery-media', false) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-thumbnails', 'gallery-thumbnails', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photographer-assets', 'photographer-assets', true) ON CONFLICT DO NOTHING;

-- Function to update storage usage after upload
CREATE OR REPLACE FUNCTION update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photographers
      SET storage_used_bytes = storage_used_bytes + COALESCE(NEW.file_size, 0)
      WHERE id = NEW.photographer_id;
    IF NEW.media_type = 'video' AND NEW.duration IS NOT NULL THEN
      UPDATE photographers
        SET video_used_seconds = video_used_seconds + NEW.duration
        WHERE id = NEW.photographer_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photographers
      SET storage_used_bytes = GREATEST(0, storage_used_bytes - COALESCE(OLD.file_size, 0))
      WHERE id = OLD.photographer_id;
    IF OLD.media_type = 'video' AND OLD.duration IS NOT NULL THEN
      UPDATE photographers
        SET video_used_seconds = GREATEST(0, video_used_seconds - OLD.duration)
        WHERE id = OLD.photographer_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_storage ON gallery_media;
CREATE TRIGGER trg_update_storage
  AFTER INSERT OR DELETE ON gallery_media
  FOR EACH ROW EXECUTE FUNCTION update_storage_usage();

-- Increment gallery views
CREATE OR REPLACE FUNCTION increment_gallery_views(gallery_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE galleries SET views = views + 1 WHERE slug = gallery_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- GALLERY CUSTOMISATION COLUMNS
-- =====================

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS cover_style TEXT DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS color_theme TEXT DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS font_style TEXT DEFAULT 'modern',
  ADD COLUMN IF NOT EXISTS grid_spacing TEXT DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS grid_roundness TEXT DEFAULT 'rounded',
  ADD COLUMN IF NOT EXISTS gallery_layout TEXT DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gallery_type TEXT NOT NULL DEFAULT 'delivery'
    CHECK (gallery_type IN ('selection', 'delivery')),
  ADD COLUMN IF NOT EXISTS background_music_url TEXT;

-- =====================
-- NOTIFICATIONS — ADD MISSING COLUMNS
-- (schema was created before gallery_id / client fields were added)
-- =====================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Make title nullable (it is not exposed in the app TypeScript types)
ALTER TABLE notifications ALTER COLUMN title DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN title SET DEFAULT NULL;

-- =====================
-- FINANCE — MISSING COLUMNS & TABLES
-- =====================

-- Add source tracking and payment linkage to finance_transactions
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'payment_sync')),
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

-- Finance Custom Categories
CREATE TABLE IF NOT EXISTS finance_custom_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  label           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(photographer_id, type, label)
);
ALTER TABLE finance_custom_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own custom categories"
  ON finance_custom_categories FOR ALL
  USING (auth.uid() = photographer_id) WITH CHECK (auth.uid() = photographer_id);

-- =====================
-- STORAGE BUCKETS
-- Run these in Supabase SQL Editor or Dashboard → Storage
-- =====================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-media', 'gallery-media', false) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-thumbnails', 'gallery-thumbnails', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photographer-assets', 'photographer-assets', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('gallery-music', 'gallery-music', true, 31457280) ON CONFLICT DO NOTHING;
