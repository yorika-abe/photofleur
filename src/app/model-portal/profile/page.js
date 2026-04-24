'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ModelProfilePage() {
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: '', name_en: '', bio: '', height: '', birthday: '', shoe_size: '',
    image: '', twitter_url: '', instagram_url: '', favorite_things: '',
  })
  const [portfolioImages, setPortfolioImages] = useState([])
  const [message, setMessage] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const res = await fetch('/api/model-portal/profile')
      const { model } = await res.json()
      if (model) {
        setModel(model)
        // 申請中データがあればそちらをフォームに表示（最新の申請内容を反映）
        const src = model.pending_data || model
        setForm({
          name: src.name || '',
          name_en: src.name_en || '',
          bio: src.bio || '',
          height: src.height || '',
          birthday: src.birthday || '',
          shoe_size: src.shoe_size || '',
          image: src.image || '',
          twitter_url: src.twitter_url || '',
          instagram_url: src.instagram_url || '',
          favorite_things: src.favorite_things || '',
        })
        setPortfolioImages(src.portfolio_images || model.portfolio_images || [])
      }
      setLoading(false)
    }
    init()
  }, [])

  async function uploadProfileImage(file) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `models/profile-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (error) { alert('アップロードエラー: ' + error.message); setUploading(false); return }
    const { data } = supabase.storage.from('images').getPublicUrl(path)
    setForm(f => ({ ...f, image: data.publicUrl }))
    setUploading(false)
  }

  async function uploadPortfolioImages(files) {
    setUploading(true)
    const uploaded = []
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `models/portfolio-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
      if (error) { alert('アップロードエラー: ' + error.message); continue }
      const { data } = supabase.storage.from('images').getPublicUrl(path)
      uploaded.push(data.publicUrl)
    }
    setPortfolioImages(prev => [...prev, ...uploaded])
    setUploading(false)
  }

  async function save() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/model-portal/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        name_en: form.name_en || null,
        bio: form.bio || null,
        height: form.height ? Number(form.height) : null,
        birthday: form.birthday || null,
        shoe_size: form.shoe_size || null,
        image: form.image || null,
        twitter_url: form.twitter_url || null,
        instagram_url: form.instagram_url || null,
        favorite_things: form.favorite_things || null,
        portfolio_images: portfolioImages,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) {
      setMessage('エラー: ' + data.error)
    } else {
      setMessage('申請しました。運営の確認後に公開されます。')
    }
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
  const lbl = (text, req) => (
    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>
      {text}{req && <span style={{ color: 'red', marginLeft: 4 }}>*</span>}
    </label>
  )

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  if (!model) return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 32px', border: '1px solid #e5e5e5' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', marginBottom: 12 }}>プロフィールが未設定です</h2>
        <p style={{ color: '#666', lineHeight: 1.8, fontSize: 14 }}>運営までご連絡ください。</p>
      </div>
    </div>
  )

  const statusLabel = model.status === 'active' ? { text: '公開中', color: '#388e3c', bg: '#e8f5e9' }
    : model.status === 'pending' ? { text: '承認待ち', color: '#e65100', bg: '#fff3e0' }
    : { text: '非公開', color: '#999', bg: '#f5f5f5' }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>マイプロフィール</h1>
        <span style={{ background: statusLabel.bg, color: statusLabel.color, borderRadius: 6, padding: '4px 14px', fontSize: 13, fontWeight: 600 }}>
          {statusLabel.text}
        </span>
      </div>

      {model.status === 'pending' && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#795548', lineHeight: 1.7 }}>
          {model.pending_data
            ? '⏳ 変更申請中です。運営が承認するまで、一般公開ページには以前の情報が表示されています。'
            : '⏳ プロフィールは運営の確認待ちです。承認後に公開されます。'}
        </div>
      )}

      {message && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#388e3c' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Basic info */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 18 }}>基本情報</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>{lbl('表示名', true)}<input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>{lbl('英字名')}<input style={inp} value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Hanako Yamada" /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            {lbl('自己紹介・プロフィール')}
            <textarea style={{ ...inp, resize: 'vertical' }} rows={4} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="自己紹介を書いてください..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>{lbl('身長（cm）')}<input type="number" style={inp} value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} /></div>
            <div>{lbl('誕生日')}<input style={inp} value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} placeholder="2000/01/01" /></div>
            <div>{lbl('靴サイズ')}<input style={inp} value={form.shoe_size} onChange={e => setForm(f => ({ ...f, shoe_size: e.target.value }))} placeholder="24.0cm" /></div>
          </div>
          <div>
            {lbl('好きなもの・趣味')}
            <input style={inp} value={form.favorite_things} onChange={e => setForm(f => ({ ...f, favorite_things: e.target.value }))} placeholder="カフェ巡り、読書..." />
          </div>
        </section>

        {/* Profile image */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 18 }}>プロフィール画像</h2>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {form.image && (
              <div style={{ width: 100, height: 133, borderRadius: 10, overflow: 'hidden', background: '#d6ecf5', flexShrink: 0, position: 'relative' }}>
                <img src={form.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setForm(f => ({ ...f, image: '' }))}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13 }}>×</button>
              </div>
            )}
            <div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                📷 写真を選ぶ
                <input type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && uploadProfileImage(e.target.files[0])} />
              </label>
              {uploading && <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>アップロード中...</p>}
            </div>
          </div>
        </section>

        {/* SNS */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 18 }}>SNS</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>{lbl('X / Twitter URL')}<input style={inp} value={form.twitter_url} onChange={e => setForm(f => ({ ...f, twitter_url: e.target.value }))} placeholder="https://x.com/..." /></div>
            <div>{lbl('Instagram URL')}<input style={inp} value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))} placeholder="https://instagram.com/..." /></div>
          </div>
        </section>

        {/* Portfolio */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 6 }}>ポートフォリオ画像</h2>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>複数枚まとめて選択できます</p>

          {portfolioImages.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 20 }}>
              {portfolioImages.map((url, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '3/4', background: '#d6ecf5' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setPortfolioImages(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0f7fb', color: '#1a3560', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, border: '2px dashed #5bbfd6' }}>
            📷 写真を追加（複数可）
            <input type="file" accept="image/*" multiple disabled={uploading} style={{ display: 'none' }}
              onChange={e => e.target.files?.length && uploadPortfolioImages(e.target.files)} />
          </label>
          {uploading && <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>アップロード中...</p>}
        </section>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={save} disabled={saving || uploading}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '16px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : '保存して申請する'}
          </button>
          {message && (
            <span style={{ fontSize: 14, fontWeight: 600, color: message.startsWith('エラー') ? '#c62828' : '#388e3c' }}>
              {message.startsWith('エラー') ? '' : '✓ '}{message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
