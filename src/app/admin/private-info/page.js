'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ModelStaffTabs from '@/components/ModelStaffTabs'

const FIELD_LABELS = {
  real_name: '本名', address: '住所', station: '最寄り駅',
  phone: '電話番号', email: 'メールアドレス',
  agency: '事務所名', school_company: '学校・会社名', guardian_name: '保護者名',
  bank_name: '銀行名', branch_name: '支店名', account_type: '口座種別',
  account_number: '口座番号', account_holder: '口座名義',
}

function InfoCard({ model, info, onApprove, onReject }) {
  const [open, setOpen] = useState(false)
  const hasPending = !!info?.pending_changes
  const hasInfo = info && Object.values(FIELD_LABELS).some((_, i) => info[Object.keys(FIELD_LABELS)[i]])

  return (
    <div style={{ background: '#fff', border: hasPending ? '2px solid #90caf9' : '1px solid #e5e5e5', borderRadius: 14, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }}
      >
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e8f4fb', overflow: 'hidden', flexShrink: 0 }}>
          {model.image
            ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: '#0d1f3a', fontSize: 15 }}>{model.name}</div>
          <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {info?.contract_agreed_at
              ? <span style={{ color: '#388e3c', fontWeight: 600 }}>✅ 契約締結済み</span>
              : <span style={{ color: '#999' }}>契約未締結</span>}
            {!hasInfo && <span style={{ color: '#bbb' }}>未入力</span>}
            {hasPending && <span style={{ background: '#1565c0', color: '#fff', borderRadius: 4, padding: '1px 8px', fontWeight: 700 }}>変更申請あり</span>}
          </div>
        </div>
        <span style={{ color: '#aaa', fontSize: 18 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '20px' }}>
          {!info ? (
            <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>まだ情報が入力されていません。</p>
          ) : (
            <>
              {/* 現在の情報 */}
              {(
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', marginBottom: 8, letterSpacing: '0.05em' }}>現在の登録情報</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6, marginBottom: 10 }}>
                    {Object.entries(FIELD_LABELS).map(([key, label]) => {
                      if (key === 'guardian_name' && !info[key]) return null
                      return (
                        <div key={key} style={{ borderRadius: 6, padding: '6px 10px', borderBottom: '1px solid #f0f0f0' }}>
                          <div style={{ fontSize: 10, color: '#aaa', marginBottom: 1 }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: info[key] ? '#1a3560' : '#bbb' }}>{info[key] || '未入力'}</div>
                        </div>
                      )
                    })}
                  </div>
                  {info.contract_agreed_at && (
                    <div style={{ fontSize: 11, color: '#388e3c', fontWeight: 600 }}>
                      締結日：{new Date(info.contract_agreed_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}

              {/* 変更申請 */}
              {hasPending && (
                <div style={{ marginTop: 20, background: '#e3f2fd', borderRadius: 12, padding: '16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1565c0', marginBottom: 12 }}>📋 変更申請内容</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginBottom: 16 }}>
                    {Object.entries(FIELD_LABELS).map(([key, label]) => {
                      const oldVal = info[key] || ''
                      const newVal = info.pending_changes[key] || ''
                      const changed = oldVal !== newVal
                      return newVal ? (
                        <div key={key} style={{ background: changed ? '#e3f2fd' : '#f8fbff', borderRadius: 8, padding: '10px 14px', border: changed ? '1px solid #90caf9' : 'none' }}>
                          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{label}{changed && ' ✏️'}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a3560' }}>{newVal}</div>
                          {changed && oldVal && <div style={{ fontSize: 11, color: '#aaa', textDecoration: 'line-through', marginTop: 2 }}>{oldVal}</div>}
                        </div>
                      ) : null
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => onApprove(model.id)}
                      style={{ background: '#388e3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      承認する
                    </button>
                    <button onClick={() => onReject(model.id)}
                      style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
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

export default function AdminPrivateInfoPage() {
  const [models, setModels] = useState([])
  const [infos, setInfos] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/private-info').then(r => r.json()).then(d => {
      setModels(d.models || [])
      setInfos(d.infos || {})
      setLoading(false)
    })
  }, [])

  async function handleApprove(modelId) {
    if (!confirm('この変更申請を承認しますか？')) return
    await fetch('/api/admin/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', model_id: modelId }),
    })
    setInfos(prev => {
      const info = prev[modelId]
      if (!info) return prev
      return { ...prev, [modelId]: { ...info, ...info.pending_changes, pending_changes: null } }
    })
  }

  async function handleReject(modelId) {
    if (!confirm('この変更申請を却下しますか？')) return
    await fetch('/api/admin/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', model_id: modelId }),
    })
    setInfos(prev => ({ ...prev, [modelId]: { ...prev[modelId], pending_changes: null } }))
  }

  const pendingCount = Object.values(infos).filter(i => i?.pending_changes).length

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 0' }}>
        <ModelStaffTabs badges={{ '/admin/private-info': pendingCount }} />
      </div>
      <div style={{ marginBottom: 28 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {models.map(m => (
          <InfoCard
            key={m.id}
            model={m}
            info={infos[m.id] || null}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
        {models.length === 0 && <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>モデルが登録されていません。</p>}
      </div>
    </div>
  )
}
