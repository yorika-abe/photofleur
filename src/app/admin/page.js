import Link from 'next/link'
import { cookies } from 'next/headers'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const metadata = { title: '管理画面 | PhotoFleur' }

export default async function AdminPage() {
  const supabase = await createSupabaseAdminClient()

  const today = new Date().toISOString().split('T')[0]
  const cookieStore = await cookies()
  const lastViewed = cookieStore.get('bookings_last_viewed')?.value

  const [
    { count: pendingShifts },
    { count: pendingModels },
    { count: newBookings },
  ] = await Promise.all([
    supabase.from('model_shifts').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval').gte('event_date', today),
    supabase.from('models').select('*', { count: 'exact', head: true }).not('pending_data', 'is', null),
    lastViewed
      ? supabase.from('bookings').select('*', { count: 'exact', head: true }).gt('created_at', lastViewed)
      : supabase.from('bookings').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a3560', marginBottom: 8 }}>管理ダッシュボード</h1>
      <p style={{ color: '#666', marginBottom: 40, fontSize: 14 }}>PhotoFleur 運営管理パネル</p>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
        {[
          { href: '/admin/bookings', label: '予約一覧', icon: '📋', badge: newBookings ?? 0 },
          { href: '/admin/booking-status', label: '予約状況', icon: '📊' },
          { href: '/admin/sales', label: '売上管理', icon: '💰' },
          { href: '/admin/models', label: 'モデル管理', icon: '👤', badge: pendingModels ?? 0 },
          { href: '/admin/schedule', label: 'イベント作成', icon: '📅' },
          { href: '/admin/shifts', label: 'シフト承認', icon: '🗓️', badge: pendingShifts ?? 0 },
          { href: '/admin/shift-requests', label: 'シフト指定日管理', icon: '📆' },
          { href: '/admin/coupons', label: 'クーポン管理', icon: '🎟️' },
          { href: '/admin/blog', label: 'ブログ管理', icon: '✍️' },
          { href: '/admin/media', label: 'メディア管理', icon: '🖼️' },
          { href: '/admin/representative', label: '代表メッセージ', icon: '✉️' },
          { href: '/admin/users', label: 'ユーザー権限管理', icon: '🔑' },
          { href: '/model-portal', label: 'モデルポータル', icon: '🌸' },
        ].map(link => (
          <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#1a3560', color: '#fff', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
              <span style={{ fontSize: 24 }}>{link.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{link.label}</span>
              {link.badge > 0 && (
                <span style={{ marginLeft: 'auto', background: '#e53935', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                  {link.badge}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
