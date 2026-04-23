'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const ROLE_OPTIONS = [
  { value: 'admin', label: '運営', color: '#1565c0', bg: '#e3f2fd' },
  { value: 'model', label: 'モデル', color: '#c2185b', bg: '#fce4ec' },
]

const TABS = [
  { key: 'all', label: 'すべて' },
  { key: 'admin', label: '運営' },
  { key: 'model', label: 'モデル' },
  { key: 'photographer', label: '一般' },
]

function RoleBadges({ roles }) {
  if (!roles || roles.length === 0 || (roles.length === 1 && roles[0] === 'photographer')) {
    return <span style={{ background: '#f5f5f5', color: '#888', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>一般</span>
  }
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {ROLE_OPTIONS.filter(r => roles.includes(r.value)).map(r => (
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

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

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

  const filtered = users.filter(u => {
    const roles = u.roles || []
    if (tab === 'all') return true
    if (tab === 'admin') return roles.includes('admin')
    if (tab === 'model') return roles.includes('model')
    if (tab === 'photographer') return !roles.includes('admin') && !roles.includes('model')
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
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: '8px 0 24px' }}>ユーザー権限管理</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={tabStyle(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#999' }}>該当するユーザーはいません。</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
          {filtered.map((user, i) => {
            const userRoles = user.roles || ['photographer']
            return (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', flexWrap: 'wrap',
                borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none',
                opacity: changing === user.id ? 0.6 : 1,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>{user.name || '（名前なし）'}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{user.email}</div>
                </div>
                <RoleBadges roles={userRoles} />
                <div style={{ display: 'flex', gap: 8 }}>
                  {ROLE_OPTIONS.map(r => (
                    <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: userRoles.includes(r.value) ? r.color : '#aaa' }}>
                      <input
                        type="checkbox"
                        checked={userRoles.includes(r.value)}
                        disabled={changing === user.id}
                        onChange={() => toggleRole(user.id, r.value, userRoles)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: r.color }}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
