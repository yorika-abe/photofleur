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

  return (
    <div style={{ background: '#fff', border: hasPending ? '2px solid #90caf9' : '1px solid #e5e5e5', borderRadius: 14, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: 'pointer' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e8f0fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🐈‍⬛</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: '#0d1f3a', fontSize: 15 }}>{staff.name || '（名前なし）'}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{staff.email || ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {hasPending && <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>変更申請あり</span>}
          {contractAgreed
            ? <span style={{ background: '#e8f5e9', color: '#388e3c', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>✅ 規約締結済み</span>
            : <span style={{ background: '#fff8e1', color: '#f57f17', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>規約未締結</span>}
          {!hasInfo && <span style={{ background: '#ffebee', color: '#c62828', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>情報未登録</span>}
          <span style={{ fontSize: 18, color: '#aaa' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 20px 18px', borderTop: '1px solid #f0f0f0' }}>
          {!hasInfo ? (
            <p style={{ color: '#bbb', fontSize: 13, paddingTop: 14 }}>非公開情報がまだ登録されていません。</p>
          ) : (
            <>
              {hasPending && (
                <div style={{ background: '#e3f2fd', borderRadius: 10, padding: '14px 16px', margin: '14px 0' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1565c0', marginBottom: 10 }}>変更申請内容</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {Object.entries(FIELD_LABELS).map(([key, label]) => {
                      const cur = info[key]
                      const next = info.pending_changes[key]
                      if (cur === next) return null
                      return (
                        <div key={key} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                          <div style={{ color: '#888', fontSize: 11, marginBottom: 3 }}>{label}</div>
                          <div style={{ textDecoration: 'line-through', color: '#bbb' }}>{cur || '（空）'}</div>
                          <div style={{ color: '#1a3560', fontWeight: 700 }}>→ {next || '（空）'}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => onReject(staff.id)} disabled={!!actionLoading}
                      style={{ flex: 1, background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 8, padding: '9px', fontWeight: 700, fontSize: 13, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                      却下
                    </button>
                    <button onClick={() => onApprove(staff.id)} disabled={!!actionLoading}
                      style={{ flex: 2, background: actionLoading ? '#ccc' : '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontWeight: 700, fontSize: 13, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                      {actionLoading === staff.id ? '処理中...' : '変更を承認'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                {Object.entries(FIELD_LABELS).map(([key, label]) => (
                  <div key={key} style={{ background: '#f8fbff', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: info[key] ? '#1a3560' : '#bbb' }}>{info[key] || '未入力'}</div>
                  </div>
                ))}
              </div>
              {contractAgreed && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#388e3c' }}>
                  規約締結日：{new Date(info.contract_agreed_at).toLocaleDateString('ja-JP')}
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
