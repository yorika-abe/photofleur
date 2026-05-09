'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ModelStaffTabs from '@/components/ModelStaffTabs'

const FIELD_LABELS = {
  real_name: '本名', phone: '電話番号', email: 'メールアドレス',
  address: '住所', station: '最寄り駅',
  bank_name: '銀行名', branch_name: '支店名', account_type: '口座種別',
  account_number: '口座番号', account_holder: '口座名義',
}

function StaffCard({ staff, onApprove, onReject, actionLoading }) {
  const [open, setOpen] = useState(false)
  const info = staff.info
  const hasPending = !!info?.pending_changes
  const hasInfo = !!(info?.real_name)
  const contractAgreed = !!info?.contract_agreed_at
  const photo = info?.profile_photo || ''
  const displayName = info?.display_name || staff.name || '（名前なし）'

  return (
    <div style={{ background: '#fff', border: hasPending ? '2px solid #90caf9' : '1px solid #e5e5e5', borderRadius: 14, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: 'pointer' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e8f0fb', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {photo
            ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 20 }}>🐈‍⬛</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: '#0d1f3a', fontSize: 15 }}>{displayName}</div>
          <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {contractAgreed
              ? <span style={{ color: '#388e3c', fontWeight: 600 }}>✅ 規約締結済み</span>
              : <span style={{ color: '#999' }}>規約未締結</span>}
            {!hasInfo && <span style={{ color: '#bbb' }}>情報未登録</span>}
            {hasPending && <span style={{ background: '#1565c0', color: '#fff', borderRadius: 4, padding: '1px 8px', fontWeight: 700 }}>変更申請あり</span>}
          </div>
        </div>
        <span style={{ color: '#aaa', fontSize: 18 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 20px' }}>
          {!hasInfo ? (
            <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>非公開情報がまだ登録されていません。</p>
          ) : (
            <>
              {/* 現在の情報 */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', marginBottom: 8, letterSpacing: '0.05em' }}>現在の登録情報</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4, marginBottom: 8 }}>
                  {Object.entries(FIELD_LABELS).map(([key, label]) => (
                    <div key={key} style={{ borderRadius: 6, padding: '6px 10px', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ fontSize: 10, color: '#aaa', marginBottom: 1 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: info[key] ? '#1a3560' : '#bbb' }}>{info[key] || '未入力'}</div>
                    </div>
                  ))}
                </div>
                {contractAgreed && (
                  <div style={{ fontSize: 11, color: '#388e3c', fontWeight: 600, marginTop: 4 }}>
                    締結日：{new Date(info.contract_agreed_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {/* 変更申請 */}
              {hasPending && (
                <div style={{ marginTop: 16, background: '#e3f2fd', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1565c0', marginBottom: 10 }}>📋 変更申請内容</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 14 }}>
                    {Object.entries(FIELD_LABELS).map(([key, label]) => {
                      const oldVal = info[key] || ''
                      const newVal = info.pending_changes[key] || ''
                      const changed = oldVal !== newVal
                      if (!newVal && !changed) return null
                      return (
                        <div key={key} style={{ background: changed ? '#dbeafe' : '#f8fbff', borderRadius: 8, padding: '8px 12px', border: changed ? '1px solid #90caf9' : 'none' }}>
                          <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{label}{changed ? ' ✏️' : ''}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3560' }}>{newVal || '（空）'}</div>
                          {changed && oldVal && <div style={{ fontSize: 11, color: '#aaa', textDecoration: 'line-through', marginTop: 2 }}>{oldVal}</div>}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => onApprove(staff.id)} disabled={!!actionLoading}
                      style={{ background: actionLoading === staff.id ? '#ccc' : '#388e3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                      {actionLoading === staff.id ? '処理中...' : '承認する'}
                    </button>
                    <button onClick={() => onReject(staff.id)} disabled={!!actionLoading}
                      style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                      却下する
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function StaffManagePage() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/staff-manage')
    const data = await res.json()
    setStaff(data.staff || [])
    setLoading(false)
  }

  async function handleApprove(userId) {
    if (!confirm('この変更申請を承認しますか？')) return
    setActionLoading(userId)
    await fetch('/api/admin/staff-manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_changes', user_id: userId }),
    })
    setActionLoading(null)
    load()
  }

  async function handleReject(userId) {
    if (!confirm('この変更申請を却下しますか？')) return
    setActionLoading(userId)
    await fetch('/api/admin/staff-manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_changes', user_id: userId }),
    })
    setActionLoading(null)
    load()
  }

  const pendingCount = staff.filter(s => s.info?.pending_changes).length

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 0' }}>
        <ModelStaffTabs badges={{ '/admin/staff-manage': pendingCount }} />
      </div>
      <div style={{ marginBottom: 28 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {staff.map(s => (
          <StaffCard key={s.id} staff={s} onApprove={handleApprove} onReject={handleReject} actionLoading={actionLoading} />
        ))}
        {staff.length === 0 && (
          <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>スタッフが登録されていません。</p>
        )}
      </div>
    </div>
  )
}
