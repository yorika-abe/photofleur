'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const TIER_LABELS = {
  staff:  { label: '運営スタッフ', color: '#1a3560', bg: '#e8f0fb' },
  '12000': { label: '12000モデル', color: '#6a1b9a', bg: '#f3e5f5' },
  '9900':  { label: '9900モデル',  color: '#00695c', bg: '#e0f2f1' },
  '8900':  { label: '8900モデル',  color: '#e65100', bg: '#fff3e0' },
}

const FIELD_LABELS = {
  name: '表示名', name_en: '英字名', bio: 'プロフィール', height: '身長',
  birthday: '誕生日', shoe_size: '靴サイズ', image: 'プロフィール画像',
  twitter_url: 'X (Twitter)', instagram_url: 'Instagram',
  favorite_things: '好きなもの', portfolio_images: 'ポートフォリオ',
}

function PendingDiff({ model }) {
  const [open, setOpen] = useState(false)
  if (!model.pending_data) return null
  const changed = Object.keys(FIELD_LABELS).filter(k => {
    const cur = k === 'portfolio_images' ? JSON.stringify(model[k] || []) : model[k]
    const nxt = k === 'portfolio_images' ? JSON.stringify(model.pending_data[k] || []) : model.pending_data[k]
    return cur !== nxt
  })
  if (changed.length === 0) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#1565c0', fontWeight: 600, padding: 0 }}>
        {open ? '▲' : '▼'} 変更内容を確認 ({changed.length}件)
      </button>
      {open && (
        <div style={{ marginTop: 8, background: '#f5f9ff', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
          {changed.map(k => (
            <div key={k} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: '#555', marginBottom: 3 }}>{FIELD_LABELS[k]}</div>
              {k === 'image' ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {model[k] && <img src={model[k]} alt="現在" style={{ width: 48, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} />}
                  <span style={{ color: '#aaa' }}>→</span>
                  {model.pending_data[k] && <img src={model.pending_data[k]} alt="変更後" style={{ width: 48, height: 60, objectFit: 'cover', borderRadius: 4, border: '2px solid #388e3c' }} />}
                </div>
              ) : k === 'portfolio_images' ? (
                <span style={{ color: '#666' }}>画像枚数: {(model[k] || []).length} → {(model.pending_data[k] || []).length}枚</span>
              ) : (
                <div>
                  <span style={{ color: '#999', textDecoration: 'line-through', marginRight: 6 }}>{String(model[k] || '（空）')}</span>
                  <span style={{ color: '#388e3c', fontWeight: 600 }}>→ {String(model.pending_data[k] || '（空）')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminModelsPage() {
  const [tab, setTab] = useState('pending')
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetch('/api/admin/models')
      .then(r => r.json())
      .then(({ models }) => { setModels(models || []); setLoading(false) })
  }, [])

  function showToast(msg, color = '#388e3c') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3000)
  }

  async function approve(id, isChange) {
    setProcessing(id + '_approve')
    const res = await fetch(`/api/admin/model/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    setProcessing(null)
    if (!res.ok) { showToast('エラーが発生しました', '#c62828'); return }
    setModels(prev => prev.map(m => m.id === id ? { ...m, status: 'active', pending_data: null } : m))
    showToast(isChange ? '変更を承認しました ✓' : 'モデルを公開しました ✓')
  }

  async function reject(id, isChange) {
    const msg = isChange ? '変更申請を却下しますか？（現在の公開情報は維持されます）' : 'このモデルを非公開にしますか？'
    if (!confirm(msg)) return
    setProcessing(id + '_reject')
    const res = await fetch(`/api/admin/model/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    })
    setProcessing(null)
    if (!res.ok) { showToast('エラーが発生しました', '#c62828'); return }
    setModels(prev => prev.map(m =>
      m.id === id
        ? isChange ? { ...m, pending_data: null } : { ...m, status: 'inactive', pending_data: null }
        : m
    ))
    showToast(isChange ? '変更を却下しました（公開情報は維持）' : '非公開にしました', '#e65100')
  }

  const pending = models.filter(m => m.status === 'pending' || (m.status === 'active' && m.pending_data))
  const active = models.filter(m => m.status === 'active' && !m.pending_data)
  const inactive = models.filter(m => m.status === 'inactive')

  const tabs = [
    { key: 'pending', label: `承認待ち (${pending.length})`, color: '#e65100' },
    { key: 'active', label: `公開中 (${active.length})`, color: '#388e3c' },
    { key: 'inactive', label: `非公開 (${inactive.length})`, color: '#999' },
  ]

  const displayModels = tab === 'pending' ? pending : tab === 'active' ? active : inactive

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: '#fff', borderRadius: 10, padding: '14px 28px', fontWeight: 700, fontSize: 15, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 32px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a3560', margin: 0 }}>モデル管理</h1>
        <Link href="/admin/models/new"
          style={{ background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 14 }}>
          + 新規登録
        </Link>
      </div>

      {pending.length > 0 && tab !== 'pending' && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffe082', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#e65100', cursor: 'pointer' }}
          onClick={() => setTab('pending')}>
          ⚠️ 承認待ちのモデルが {pending.length} 件あります → 確認する
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: tab === t.key ? '#1a3560' : '#f0f0f0', color: tab === t.key ? '#fff' : '#555' }}>
            {t.label}
          </button>
        ))}
      </div>

      {displayModels.length === 0
        ? <p style={{ color: '#999' }}>該当するモデルはいません。</p>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {displayModels.map(model => {
              const isChange = model.status === 'active' && !!model.pending_data
              const approvingThis = processing === model.id + '_approve'
              const rejectingThis = processing === model.id + '_reject'
              return (
                <div key={model.id} style={{ background: '#fff', borderRadius: 14, border: tab === 'pending' ? '2px solid #ffb74d' : '1px solid #e5e5e5', overflow: 'hidden' }}>
                  <div style={{ height: 200, background: '#e0d8f0', overflow: 'hidden', position: 'relative' }}>
                    {(isChange ? model.pending_data?.image || model.image : model.image)
                      ? <img src={isChange ? model.pending_data?.image || model.image : model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0a0c0', fontSize: 32 }}>👤</div>
                    }
                    {tab === 'pending' && (
                      <div style={{ position: 'absolute', top: 8, left: 8, background: isChange ? '#1565c0' : '#ff9800', color: '#fff', borderRadius: 4, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                        {isChange ? '変更申請' : '新規申請'}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginBottom: 2 }}>{model.name || '（名前未設定）'}</div>
                    {model.name_en && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{model.name_en}</div>}
                    {model.price_tier && TIER_LABELS[model.price_tier] && (
                      <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, background: TIER_LABELS[model.price_tier].bg, color: TIER_LABELS[model.price_tier].color, borderRadius: 4, padding: '2px 8px', marginBottom: 6 }}>
                        {TIER_LABELS[model.price_tier].label}
                      </span>
                    )}
                    {model.bio && <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{model.bio}</p>}

                    {tab === 'pending' && <PendingDiff model={model} />}

                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {tab === 'pending' && (
                        <>
                          <button onClick={() => approve(model.id, isChange)} disabled={!!processing}
                            style={{ flex: 1, background: approvingThis ? '#aaa' : '#388e3c', color: '#fff', border: 'none', borderRadius: 7, padding: '8px', cursor: processing ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
                            {approvingThis ? '処理中...' : isChange ? '変更を承認' : '承認して公開'}
                          </button>
                          <button onClick={() => reject(model.id, isChange)} disabled={!!processing}
                            style={{ background: rejectingThis ? '#aaa' : '#fce4ec', color: rejectingThis ? '#fff' : '#c62828', border: 'none', borderRadius: 7, padding: '8px 12px', cursor: processing ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 12 }}>
                            {rejectingThis ? '処理中...' : isChange ? '却下' : '却下'}
                          </button>
                        </>
                      )}
                      <Link href={`/admin/models/${model.id}`}
                        style={{ flex: tab !== 'pending' ? 1 : undefined, display: 'block', textAlign: 'center', background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 7, padding: '8px', fontSize: 13, fontWeight: 600 }}>
                        編集
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}
