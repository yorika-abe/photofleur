import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const metadata = { title: '管理画面 | PhotoFleur' }

export default async function AdminPage() {
  const supabase = await createSupabaseAdminClient()

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: pendingShifts },
    { count: pendingModels },
    { data: recentBookings },
  ] = await Promise.all([
    supabase.from('model_shifts').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval').gte('event_date', today),
    supabase.from('models').select('*', { count: 'exact', head: true }).not('pending_data', 'is', null),
    supabase.from('bookings').select('id, name, email, created_at, booking_slots(slot_label, price, event_entries(events(event_date, location_name), models(name)))').order('created_at', { ascending: false }).limit(5),
  ])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a3560', marginBottom: 8 }}>管理ダッシュボード</h1>
      <p style={{ color: '#666', marginBottom: 40, fontSize: 14 }}>PhotoFleur 運営管理パネル</p>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
        {[
          { href: '/admin/bookings', label: '予約一覧', icon: '📋' },
          { href: '/admin/booking-status', label: '予約状況', icon: '📊' },
          { href: '/admin/sales', label: '売上管理', icon: '💰' },
          { href: '/admin/models', label: 'モデル管理', icon: '👤', badge: pendingModels ?? 0 },
          { href: '/admin/schedule', label: 'スケジュール管理', icon: '📅' },
          { href: '/admin/shifts', label: 'シフト承認', icon: '🗓️', badge: pendingShifts ?? 0 },
          { href: '/admin/shift-requests', label: 'シフト指定日管理', icon: '📆' },
          { href: '/admin/coupons', label: 'クーポン管理', icon: '🎟️' },
          { href: '/admin/blog', label: 'ブログ管理', icon: '✍️' },
          { href: '/admin/media', label: 'メディア管理', icon: '🖼️' },
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

      {/* Recent bookings */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', marginBottom: 20 }}>最近の予約</h2>
        {recentBookings && recentBookings.length > 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f5ff' }}>
                  {['お名前', 'メール', 'イベント', '時間枠', '料金', '予約日'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#555', borderBottom: '1px solid #e5e5e5' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map(b => {
                  const slot = b.booking_slots
                  const event = slot?.event_entries?.events
                  const model = slot?.event_entries?.models
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#333' }}>{b.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#666' }}>{b.email}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#666' }}>{event?.event_date} {model?.name && `(${model.name})`}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#666' }}>{slot?.slot_label}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#333', fontWeight: 600 }}>¥{(slot?.price || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#999' }}>{new Date(b.created_at).toLocaleDateString('ja-JP')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#999' }}>まだ予約はありません。</p>
        )}
      </div>
    </div>
  )
}
