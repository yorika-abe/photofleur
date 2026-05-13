import Link from 'next/link'
import { cookies } from 'next/headers'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'
import AdminAvatarButton from '@/components/AdminAvatarButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: '管理画面 | PhotoFleur' }

export default async function AdminPage() {
  const supabase = await createSupabaseAdminClient()

  const today = new Date().toISOString().split('T')[0]
  const cookieStore = await cookies()
  const lastViewed = cookieStore.get('bookings_last_viewed')?.value
  const lastViewedPhotos = cookieStore.get('photos_last_viewed')?.value

  const serverClient = await createSupabaseServerClient()
  const { data: { user: currentUser } } = await serverClient.auth.getUser()
  const [{ data: avatarSetting }, { data: currentProfile }] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', 'admin_avatar_url').maybeSingle(),
    currentUser ? supabase.from('user_profiles').select('name, role').eq('id', currentUser.id).single() : { data: null },
  ])
  const adminAvatarUrl = avatarSetting?.value || null
  const isOwner = currentProfile?.role === 'owner'
  const currentName = currentProfile?.name || '運営'

  const [
    { count: pendingShifts },
    { count: pendingModels },
    { count: newBookings },
    { count: pendingPrivateInfo },
    { count: unreadFeedback },
    { count: newPhotos },
    { count: unreadActivityReports },
    { count: newModelInvites },
    { count: pendingStaffApps },
    { count: pendingBlogReview },
  ] = await Promise.all([
    supabase.from('model_shifts').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval').gte('event_date', today),
    supabase.from('models').select('*', { count: 'exact', head: true }).not('pending_data', 'is', null),
    lastViewed
      ? supabase.from('bookings').select('*', { count: 'exact', head: true }).gt('created_at', lastViewed)
      : supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('model_private_info').select('*', { count: 'exact', head: true }).not('pending_changes', 'is', null),
    supabase.from('feedbacks').select('*', { count: 'exact', head: true }).eq('is_read', false),
    lastViewedPhotos
      ? supabase.from('contributed_photos').select('*', { count: 'exact', head: true }).gt('created_at', lastViewedPhotos)
      : supabase.from('contributed_photos').select('*', { count: 'exact', head: true }),
    supabase.from('external_activity_reports').select('*', { count: 'exact', head: true }).eq('is_read', false),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('registered_via_invite', true).eq('invite_notif_seen', false),
    supabase.from('staff_recruitment_applications').select('*', { count: 'exact', head: true }).eq('status', 'applied'),
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
  ])

  return (
    <div className="admin-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="admin-title">管理ダッシュボード</h1>
          <p style={{ color: '#666', margin: 0, fontSize: 14 }}>PhotoFleur 運営管理パネル</p>
        </div>
        <AdminAvatarButton initialUrl={adminAvatarUrl} initialName={currentName} isOwner={isOwner} />
      </div>

      {/* Quick links */}
      <style>{`
        .admin-wrap { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
        .admin-title { font-size: 28px; font-weight: 700; color: #1a3560; margin-bottom: 8px; margin-top: 0; }
        .admin-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 48px; }
        .admin-btn-label { font-weight: 600; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        @media (max-width: 640px) {
          .admin-wrap { padding: 16px 12px; }
          .admin-title { font-size: 20px !important; }
          .admin-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .admin-btn-label { font-size: clamp(10px, 3vw, 12px) !important; }
        }
      `}</style>
      <div className="admin-grid">
        {[
          { href: '/admin/bookings', label: '予約・売上管理', icon: '📋', badge: newBookings ?? 0 },
          { href: '/admin/models', label: 'モデル・スタッフ管理', icon: '👤', badge: (pendingModels ?? 0) + (pendingPrivateInfo ?? 0) },
          { href: '/admin/schedule', label: 'イベント作成', icon: '📍' },
          { href: '/admin/shifts', label: 'シフト管理', icon: '🗓️', badge: pendingShifts ?? 0 },
          { href: '/admin/coupons', label: 'クーポン管理', icon: '🎟️' },
          { href: '/admin/blog', label: 'ブログ管理', icon: '✍️', badge: pendingBlogReview ?? 0 },
          { href: '/admin/feedback', label: 'ご意見箱', icon: '📮', badge: unreadFeedback ?? 0 },
          { href: '/admin/media', label: 'メディア管理', icon: '🖼️' },
          { href: '/admin/representative', label: '代表メッセージ', icon: '✉️' },
          { href: '/admin/users', label: 'ユーザー権限管理', icon: '🔑', badge: newModelInvites ?? 0 },
          { href: '/admin/photos', label: 'ご提供写真', icon: '📸', badge: newPhotos ?? 0 },
          { href: '/admin/newsletter', label: 'メルマガ配信', icon: '📧' },
          { href: '/admin/line-broadcast', label: 'LINE一斉送信', icon: '💬' },
          { href: '/admin/x-templates', label: 'X投稿テンプレート', icon: '𝕏' },
          { href: '/admin/annual-events', label: '年間イベント一覧', icon: '🌱' },
          { href: '/admin/private-products', label: '非公開商品管理', icon: '🔗' },
          { href: '/admin/goods', label: 'グッズ管理', icon: '🛍️' },
          { href: '/admin/activity-reports', label: '外部活動報告', icon: '📣', badge: unreadActivityReports ?? 0 },
          { href: '/admin/staff-recruit', label: 'スタッフ募集', icon: '🐈‍⬛', badge: pendingStaffApps ?? 0 },
        ].map(link => (
          <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#1a3560', color: '#fff', borderRadius: 12, padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 8, position: 'relative', overflow: 'hidden' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{link.icon}</span>
              <span className="admin-btn-label" style={{ minWidth: 0 }}>{link.label}</span>
              {link.badge > 0 && (
                <span style={{ marginLeft: 'auto', background: '#e53935', color: '#fff', borderRadius: 12, padding: '2px 6px', fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center', flexShrink: 0 }}>
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
