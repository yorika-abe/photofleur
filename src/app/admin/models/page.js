'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminModelsPage() {
  const [tab, setTab] = useState('pending')
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/models')
      .then(r => r.json())
      .then(({ models }) => {
        setModels(models || [])
        setLoading(false)
      })
  }, [])

  async function approve(id) {
    await fetch(`/api/admin/model/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    setModels(prev => prev.map(m => m.id === id ? { ...m, status: 'active' } : m))
  }

  async function reject(id) {
    if (!confirm('このモデルを非公開にしますか？')) return
    await fetch(`/api/admin/model/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    })
    setModels(prev => prev.map(m => m.id === id ? { ...m, status: 'inactive' } : m))
  }

  const pending = models.filter(m => m.status === 'pending')
  const active = models.filter(m => m.status === 'active' || !m.status)
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
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 32px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#2f2244', margin: 0 }}>モデル管理</h1>
        <Link href="/admin/models/new"
          style={{ background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 14 }}>
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
            style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: tab === t.key ? '#2f2244' : '#f0f0f0', color: tab === t.key ? '#fff' : '#555' }}>
            {t.label}
          </button>
        ))}
      </div>

      {displayModels.length === 0
        ? <p style={{ color: '#999' }}>該当するモデルはいません。</p>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {displayModels.map(model => (
              <div key={model.id} style={{ background: '#fff', borderRadius: 14, border: tab === 'pending' ? '2px solid #ffb74d' : '1px solid #e5e5e5', overflow: 'hidden' }}>
                <div style={{ height: 200, background: '#e0d8f0', overflow: 'hidden', position: 'relative' }}>
                  {model.image
                    ? <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0a0c0', fontSize: 32 }}>👤</div>
                  }
                  {tab === 'pending' && (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: '#ff9800', color: '#fff', borderRadius: 4, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>承認待ち</div>
                  )}
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#2f2244', marginBottom: 2 }}>{model.name || '（名前未設定）'}</div>
                  {model.name_en && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8 }}>{model.name_en}</div>}
                  {model.bio && <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{model.bio}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {tab === 'pending' && (
                      <>
                        <button onClick={() => approve(model.id)}
                          style={{ flex: 1, background: '#388e3c', color: '#fff', border: 'none', borderRadius: 7, padding: '8px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                          承認して公開
                        </button>
                        <button onClick={() => reject(model.id)}
                          style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 7, padding: '8px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                          却下
                        </button>
                      </>
                    )}
                    <Link href={`/admin/models/${model.id}`}
                      style={{ flex: tab !== 'pending' ? 1 : undefined, display: 'block', textAlign: 'center', background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 7, padding: '8px', fontSize: 13, fontWeight: 600 }}>
                      編集
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
