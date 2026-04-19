-- ======================================
-- PhotoFleur Migration v2
-- Supabase SQL Editor で実行してください
-- ======================================

-- events テーブルに新フィールド追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS main_image TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS promo_images JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS studio_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS studio_capacity INTEGER DEFAULT 10;
ALTER TABLE events ADD COLUMN IF NOT EXISTS studio_fee INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS meeting_place TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS meeting_address TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS meeting_map_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS baggage_storage BOOLEAN DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS booking_open_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS model_assembly_offset_minutes INTEGER DEFAULT 30;
ALTER TABLE events ADD COLUMN IF NOT EXISTS model_extra_note TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS model_lunch_note TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_page_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS access_note TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS studio_rules TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS street_notes TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_extra_note TEXT;

-- booking_slots テーブルに新フィールド追加
ALTER TABLE booking_slots ADD COLUMN IF NOT EXISTS slot_order INTEGER DEFAULT 0;
ALTER TABLE booking_slots ADD COLUMN IF NOT EXISTS max_reservations INTEGER DEFAULT 1;

-- bookings テーブルに新フィールド追加
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_name_kana TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS first_name_kana TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sns_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_outdoor BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_price INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS qr_token TEXT;

-- models テーブルに新フィールド追加
ALTER TABLE models ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS favorite_things TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS portfolio_images JSONB DEFAULT '[]';
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT false;

-- user_profiles ロール拡張
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('owner', 'head_staff', 'reception', 'model', 'registered_photographer', 'photographer', 'admin'));

-- クーポンテーブル
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ブログ投稿テーブル
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  cover_image TEXT,
  author_id UUID REFERENCES user_profiles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- bookings に coupon_id 追加（coupons テーブル作成後）
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id);

-- RLS追加
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active coupons" ON coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Published posts are public" ON blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Authors can manage own posts" ON blog_posts FOR ALL USING (auth.uid() = author_id);
