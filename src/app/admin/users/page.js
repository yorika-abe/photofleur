'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const ROLES = [
  { value: 'owner', label: 'オーナー', color: '#7b1fa2', bg: '#f3e5f5' },
  { value: 'admin', label: '運営', color: '#1565c0', bg: '#e3f2fd' },
  { value: 'head_staff', label: 'スタッフ（リーダー）', color: '#2e7d32', bg: '#e8f5e9' },
  { value: 'reception', label: 'スタッフ（受付）', color: '#388e3c', bg: '#f1f8e9' },
  { value: 'model', label: 'モデル', color: '#c2185b', bg: '#fce4ec' },
  { value: 'registered_photographer', label: '登録カメラマン', color: '#e65100', bg: '#fff3e0' },
  { value: 'photographer', label: '一般', color: '#757575', bg: '#f5f5f5' },
]

function RoleBadge({ role }) {
  const r = ROLES.find(r => r.value === role) || ROLES[ROLES.length - 1]
  return (
    <span style={{ background: r.bg, color: r.color, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      {r.label}
    </span>
  )
}

const TABS = [
  { key: 'all', label: 'すべて' },
  { key: 'admin', label: '運営' },
  { key: 'model', label: 'モデル' },
  { key: 'head_staff', label: 'スタッフ' },
]

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

  async function changeRole(userId, role) {
    setChanging(userId)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    setChanging(null)
  }

  const filtered = users.filter(u => {
    if (tab === 'all') return true
    if (tab === 'admin') return u.role === 'admin' || u.role === 'owner'
    if (tab === 'model') return u.role === 'model'
    if (tab === 'head_staff') return u.role === 'head_staff' || u.role === 'reception'
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
          {filtered.map((user, i) => (
            <div key={user.id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', flexWrap: 'wrap',
              borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560' }}>{user.name || '（名前なし）'}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{user.email}</div>
              </div>
              <RoleBadge role={user.role} />
              <select
                value={user.role}
                disabled={changing === user.id}
                onChange={e => changeRole(user.id, e.target.value)}
                style={{
                  padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13,
                  cursor: 'pointer', background: '#fafafa', minWidth: 160,
                  opacity: changing === user.id ? 0.5 : 1,
                }}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
