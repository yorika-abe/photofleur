'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminModelsPage() {
  const [tab, setTab] = useState('applications')
  const [applications, setApplications] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/models')
      .then(r => r.json())
      .then(({ applications, models }) => {
        setApplications(applications || [])
        setModels(models || [])
        setLoading(false)
      })
  }, [])

  async function updateApplicationStatus(id, status) {
    await fetch('/api/admin/models', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'model_applications', id, status }),
    })
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#2f2244', margin: '8px 0 32px' }}>モデル管理</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {[{ key: 'applications', label: `応募審査 (${applications.filter(a => a.status === 'pending').length})` }, { key: 'models', label: `登録モデル (${models.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: tab === t.key ? '#2f2244' : '#f0f0f0', color: tab === t.key ? '#fff' : '#555' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'applications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {applications.length === 0 ? <p style={{ color: '#999' }}>応募はありません。</p> : applications.map(app => (
            <div key={app.id} style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid #e5e5e5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#2f2244' }}>{app.name} {app.name_en && <span style={{ fontSize: 14, color: '#999', fontWeight: 400 }}>({app.name_en})</span>}</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{app.email} {app.phone && `/ ${app.phone}`}</div>
                </div>
                <span style={{
                  alignSelf: 'flex-start',
                  background: app.status === 'pending' ? '#fff3e0' : app.status === 'approved' ? '#e8f5e9' : '#fce4ec',
                  color: app.status === 'pending' ? '#e65100' : app.status === 'approved' ? '#388e3c' : '#c62828',
                  borderRadius: 6, padding: '4px 12px', fontSize: 13, fontWeight: 600,
                }}>
                  {app.status === 'pending' ? '未審査' : app.status === 'reviewing' ? '審査中' : app.status === 'approved' ? '承認済み' : '却下'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16, fontSize: 13, color: '#555' }}>
                {app.height && <div><span style={{ fontWeight: 600 }}>身長：</span>{app.height}cm</div>}
                {app.birthday && <div><span style={{ fontWeight: 600 }}>生年月日：</span>{app.birthday}</div>}
              </div>

              {app.bio && <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 12 }}><strong>自己紹介：</strong>{app.bio}</p>}
              {app.experience && <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 12 }}><strong>経験：</strong>{app.experience}</p>}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {app.instagram_url && <a href={app.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2f2244', fontSize: 13, fontWeight: 600 }}>Instagram ↗</a>}
                {app.twitter_url && <a href={app.twitter_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2f2244', fontSize: 13, fontWeight: 600 }}>X/Twitter ↗</a>}
              </div>

              <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>応募日：{new Date(app.created_at).toLocaleDateString('ja-JP')}</div>

              {app.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateApplicationStatus(app.id, 'approved')}
                    style={{ background: '#388e3c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    承認する
                  </button>
                  <button onClick={() => updateApplicationStatus(app.id, 'rejected')}
                    style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    却下する
                  </button>
                  <button onClick={() => updateApplicationStatus(app.id, 'reviewing')}
                    style={{ background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    審査中にする
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'models' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {models.length === 0 ? <p style={{ color: '#999' }}>登録モデルはいません。</p> : models.map(model => (
            <div key={model.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
              <div style={{ height: 180, background: '#e0d8f0', overflow: 'hidden' }}>
                {model.image && <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#2f2244' }}>{model.name}</span>
                  {model.is_staff && <span style={{ fontSize: 10, background: '#f0f0f0', color: '#888', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>スタッフ</span>}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginBottom: 10 }}>{model.name_en}</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8, marginBottom: 12 }}>
                  {model.street_price && <div>スト ¥{model.street_price.toLocaleString()}</div>}
                  {model.studio_price && <div>スタ ¥{model.studio_price.toLocaleString()}</div>}
                  {model.line_id && <div style={{ color: '#00b900', fontWeight: 600 }}>✓ LINE</div>}
                </div>
                <Link href={`/admin/models/${model.id}`}
                  style={{ display: 'block', textAlign: 'center', background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 7, padding: '8px', fontSize: 13, fontWeight: 600 }}>
                  編集
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
