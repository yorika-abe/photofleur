'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const ROLE_OPTIONS = [
  { value: 'admin', label: '運営', color: '#a07000', bg: '#fff8e1', accent: '#f9a825' },
  { value: 'model', label: 'モデル', color: '#c2185b', bg: '#fce4ec', accent: '#c2185b' },
  { value: 'staff', label: '受付スタッフ', color: '#1565c0', bg: '#e3f2fd', accent: '#1565c0' },
]

const TABS = [
  { key: 'all', label: 'すべて' },
  { key: 'admin', label: '運営' },
  { key: 'model', label: 'モデル' },
  { key: 'staff', label: '受付スタッフ' },
  { key: 'photographer', label: '一般' },
  { key: 'blocked', label: 'ブロック' },
]

function RoleBadges({ roles }) {
  const special = ROLE_OPTIONS.filter(r => roles?.includes(r.value))
  if (special.length === 0) {
    return <span style={{ background: '#f5f5f5', color: '#888', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>一般</span>
  }
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {special.map(r => (
        <span key={r.value} style={{ background: r.bg, color: r.color, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{r.label}</span>
      ))}
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [changing, setChanging] = useState(null)
  const [search, setSearch] = useState('')
  const [markingSeenId, setMarkingSeenId] = useState(null)

  async function load() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  async function toggleRole(userId, role, currentRoles) {
    setChanging(userId)
    const hasRole = currentRoles.includes(role)
    let newRoles = hasRole
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles.filter(r => r !== 'photographer'), role]
    if (newRoles.length === 0) newRoles = ['photographer']

    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roles: newRoles }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles: newRoles } : u))
    setChanging(null)
  }

  async function toggleBlock(userId, currentBlocked) {
    setChanging(userId)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, is_blocked: !currentBlocked }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: !currentBlocked } : u))
    setChanging(null)
  }

  async function markInviteSeen(userId) {
    setMarkingSeenId(userId)
    await fetch('/api/admin/users/mark-invite-seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, invite_notif_seen: true } : u))
    setMarkingSeenId(null)
  }

  const newInviteCount = users.filter(u => u.registered_via_invite && !u.invite_notif_seen).length

  const filtered = users.filter(u => {
    const roles = u.roles || []
    const isBlocked = !!u.is_blocked
    if (tab === 'blocked') return isBlocked
    if (isBlocked) return false
    if (tab === 'admin' && !roles.includes('admin')) return false
    if (tab === 'model' && !roles.includes('model')) return false
    if (tab === 'staff' && !roles.includes('staff')) return false
    if (tab === 'photographer' && (roles.includes('admin') || roles.includes('model') || roles.includes('staff'))) return false
    if (search) {
      const q = search.toLowerCase()
      return (u.display_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    }
    return true
  })

  const tabStyle = (key) => ({
    padding: '8px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
    background: tab === key ? '#1a3560' : '#f0f0f0',
    color: tab === key ? '#fff' : '#555',
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: 0 }}>ユーザー権限管理</h1>
        {newInviteCount > 0 && (
          <span style={{ background: '#e53935', color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 13, fontWeight: 700 }}>
            {newInviteCount} 新規
          </span>
        )}
      </div>

      {newInviteCount > 0 && (
        <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1565c0' }}>
          🌸 招待リンク経由で新しいモデルが {newInviteCount} 名登録しました。内容を確認して「既読」を押してください。
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={tabStyle(t.key)}>{t.label}</button>
        ))}
      </div>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="名前・メールアドレスで検索"
        style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, marginBottom: 20, boxSizing: 'border-box' }}
      />

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#999' }}>該当するユーザーはいません。</p>
      ) : (
        <div style={{ borderRadius: 12, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
          {filtered.map((user, i) => {
            const userRoles = user.roles || ['photographer']
            const isNew = user.registered_via_invite && !user.invite_notif_seen
            const isBlocked = !!user.is_blocked
            return (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', flexWrap: 'wrap',
                borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none',
                opacity: changing === user.id ? 0.6 : 1,
                background: isBlocked ? '#fff5f5' : isNew ? '#f0f8ff' : '#fff',
                borderLeft: isBlocked ? '4px solid #e53935' : isNew ? '4px solid #5bbfd6' : '4px solid transparent',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: isBlocked ? '#c62828' : '#1a3560' }}>{user.display_name || '（名前なし）'}</span>
                    {isBlocked && <span style={{ background: '#e53935', color: '#fff', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>ブロック中</span>}
                    {isNew && <span style={{ background: '#ff9800', color: '#fff', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>招待登録</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{user.email}</div>
                </div>
                <RoleBadges roles={userRoles} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {ROLE_OPTIONS.map(r => (
                    <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: userRoles.includes(r.value) ? r.color : '#aaa' }}>
                      <input
                        type="checkbox"
                        checked={userRoles.includes(r.value)}
                        disabled={changing === user.id}
                        onChange={() => toggleRole(user.id, r.value, userRoles)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: r.accent || r.color }}
                      />
                      {r.label}
                    </label>
                  ))}
                  <button
                    onClick={() => toggleBlock(user.id, isBlocked)}
                    disabled={changing === user.id}
                    style={{ background: isBlocked ? '#e53935' : '#f5f5f5', color: isBlocked ? '#fff' : '#888', border: isBlocked ? 'none' : '1px solid #ddd', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {isBlocked ? 'ブロック解除' : 'ブロック'}
                  </button>
                  {isNew && (
                    <button
                      onClick={() => markInviteSeen(user.id)}
                      disabled={markingSeenId === user.id}
                      style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: markingSeenId === user.id ? 0.6 : 1 }}>
                      既読
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
