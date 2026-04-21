'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function AdminMediaPage() {
  const [settings, setSettings] = useState({ hero_bg: '', hero_video: '' })
  const [uploading, setUploading] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(r => r.json())
      .then(data => setSettings(s => ({ ...s, ...data })))
  }, [])

  async function uploadFile(file, key) {
    setUploading(key)
    const ext = file.name.split('.').pop()
    const path = `site/${key}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (error) { alert('アップロードエラー: ' + error.message); setUploading(null); return }
    const { data } = supabase.storage.from('images').getPublicUrl(path)
    setSettings(s => ({ ...s, [key]: data.publicUrl }))
    setUploading(null)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/admin/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Link href="/admin" style={{ color: '#888', textDecoration: 'none', fontSize: 13 }}>← 管理画面</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>メディア管理</h1>
      </div>

      {saved && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#388e3c' }}>
          保存しました
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Hero background */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 6 }}>ヒーロー背景画像</h2>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, marginTop: 0 }}>トップページの一番上の背景に使用されます</p>

          {settings.hero_bg && (
            <div style={{ marginBottom: 16, borderRadius: 10, overflow: 'hidden', maxHeight: 200, position: 'relative' }}>
              <img src={settings.hero_bg} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
              <button onClick={() => setSettings(s => ({ ...s, hero_bg: '' }))}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                削除
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              📷 画像をアップロード
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading === 'hero_bg'}
                onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'hero_bg')} />
            </label>
            {uploading === 'hero_bg' && <span style={{ fontSize: 13, color: '#888' }}>アップロード中...</span>}
          </div>
          <div style={{ marginTop: 12 }}>
            <input style={inp} value={settings.hero_bg} onChange={e => setSettings(s => ({ ...s, hero_bg: e.target.value }))} placeholder="またはURLを直接入力" />
          </div>
        </section>

        {/* Hero video */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 6 }}>ヒーロー下の動画</h2>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, marginTop: 0 }}>トップページのヒーローセクションの下に表示されます。動画ファイルまたはYouTube URLを使用できます。</p>

          {settings.hero_video && (
            <div style={{ marginBottom: 16 }}>
              {settings.hero_video.includes('youtube') || settings.hero_video.includes('youtu.be') ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden' }}>
                  <iframe src={toEmbedUrl(settings.hero_video)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                </div>
              ) : (
                <video src={settings.hero_video} controls style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
              )}
              <button onClick={() => setSettings(s => ({ ...s, hero_video: '' }))}
                style={{ marginTop: 8, background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#888' }}>
                削除
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              🎬 動画をアップロード
              <input type="file" accept="video/*" style={{ display: 'none' }} disabled={uploading === 'hero_video'}
                onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'hero_video')} />
            </label>
            {uploading === 'hero_video' && <span style={{ fontSize: 13, color: '#888' }}>アップロード中...</span>}
          </div>
          <div style={{ marginTop: 12 }}>
            <input style={inp} value={settings.hero_video} onChange={e => setSettings(s => ({ ...s, hero_video: e.target.value }))} placeholder="またはYouTube URLを入力（例：https://youtu.be/xxxxx）" />
          </div>
        </section>

      </div>

      <button onClick={save} disabled={saving}
        style={{ marginTop: 24, background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 36px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? '保存中...' : '保存する'}
      </button>
    </div>
  )
}

function toEmbedUrl(url) {
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v')
    return `https://www.youtube.com/embed/${id}`
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1].split('?')[0]
    return `https://www.youtube.com/embed/${id}`
  }
  if (url.includes('youtube.com/embed/')) return url
  return url
}
