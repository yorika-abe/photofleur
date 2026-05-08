'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/models', label: 'モデル管理' },
  { href: '/admin/private-info', label: '非公開登録情報' },
  { href: '/admin/model-invite', label: 'モデル登録リンク' },
  { href: '/admin/staff-invite', label: 'スタッフ登録リンク' },
  { href: '/admin/staff-manage', label: 'スタッフ管理' },
]

export default function ModelStaffTabs({ badges = {} }) {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e5e5', flex: 1, overflowX: 'auto' }}>
      {TABS.map(tab => {
        const isActive = pathname === tab.href || (tab.href !== '/admin/models' ? false : pathname.startsWith('/admin/models/'))
        const badge = badges[tab.href]
        return (
          <Link key={tab.href} href={tab.href} style={{
            padding: '10px 16px', fontWeight: isActive ? 700 : 600, fontSize: 13,
            color: isActive ? '#1a3560' : '#999',
            borderBottom: isActive ? '2px solid #1a3560' : '2px solid transparent',
            marginBottom: -2, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
          }}>
            {tab.label}
            {badge > 0 && (
              <span style={{ background: '#e53935', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{badge}</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
