
-- ======================================
-- PhotoFleur データベーススキーマ
-- Supabase で実行してください
-- ======================================

-- ユーザープロフィール（Supabase Authと連携）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'photographer' CHECK (role IN ('photographer', 'model', 'admin')),
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auth後に自動でprofileを作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'photographer'),
    new.raw_user_meta_data->>'name',
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- モデルテーブル（既存 + 追加フィールド）
CREATE TABLE IF NOT EXISTS models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  bio TEXT,
  image TEXT,
  height INTEGER,
  shoe_size TEXT,
  birthday DATE,
  street_price INTEGER DEFAULT 0,
  duration_street TEXT,
  studio_price INTEGER DEFAULT 0,
  duration_studio TEXT,
  sns TEXT,
  line_id TEXT,          -- LINE User ID for notifications
  user_id UUID REFERENCES auth.users(id), -- linked auth user
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベントテーブル（既存 + 追加フィールド）
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('street', 'studio', 'irregular')),
  location_name TEXT,
  address TEXT,
  map_address TEXT,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベントエントリー（モデルとイベントの紐付け）
CREATE TABLE IF NOT EXISTS event_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  UNIQUE(event_id, model_id)
);

-- 予約枠
CREATE TABLE IF NOT EXISTS booking_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_entry_id UUID REFERENCES event_entries(id) ON DELETE CASCADE,
  slot_label TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  price INTEGER DEFAULT 0,
  is_reserved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 予約（既存 + 追加フィールド）
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES booking_slots(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  payment_method TEXT CHECK (payment_method IN ('cash', 'square')) DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled', 'refunded')),
  square_payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 旧reservationsテーブル（ストリート予約用、後方互換性のため保持）
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- モデル応募
CREATE TABLE IF NOT EXISTS model_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  height INTEGER,
  birthday DATE,
  bio TEXT,
  experience TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- モデルシフト提出
CREATE TABLE IF NOT EXISTS model_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT CHECK (event_type IN ('street', 'studio', 'irregular')),
  available_slots JSONB DEFAULT '[]',  -- [{start: "10:00", end: "11:00"}, ...]
  notes TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- リクエスト撮影
CREATE TABLE IF NOT EXISTS shoot_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  location_preference TEXT,
  model_preference TEXT,
  description TEXT NOT NULL,
  budget TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'confirmed', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LINE通知ログ
CREATE TABLE IF NOT EXISTS line_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type TEXT NOT NULL,  -- 'booking', 'day_before'
  message TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- Row Level Security (RLS) 設定
-- ======================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoot_requests ENABLE ROW LEVEL SECURITY;

-- user_profiles: 自分のプロフィールのみ読み書き可
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- models: 公開読み取り可
CREATE POLICY "Public can read approved models" ON models FOR SELECT USING (status = 'approved');

-- events: 公開読み取り可
-- (No RLS needed, events are public)

-- bookings: 自分の予約のみ
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- model_applications: 応募者のみ
CREATE POLICY "Applicants can submit" ON model_applications FOR INSERT WITH CHECK (true);

-- model_shifts: モデル本人のみ
CREATE POLICY "Models can view own shifts" ON model_shifts FOR SELECT USING (
  model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
);
CREATE POLICY "Models can insert own shifts" ON model_shifts FOR INSERT WITH CHECK (
  model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
);

-- shoot_requests: 誰でも投稿可
CREATE POLICY "Anyone can submit requests" ON shoot_requests FOR INSERT WITH CHECK (true);

-- ======================================
-- 初期データ（管理者アカウント設定）
-- ======================================
-- 注意: Supabase Auth で yorika.photo@gmail.com を登録後、
-- 以下を実行してadmin権限を付与してください:
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'yorika.photo@gmail.com';
