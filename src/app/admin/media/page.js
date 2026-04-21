'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminMediaPage() {
  const [heroImages, setHeroImages] = useState([])
  const [heroVideo, setHeroVideo] = useState('')
  const [uploading, setUploading] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(r => r.json())
      .then(data => {
        setHeroImages(JSON.parse(data.hero_bg_images || '[]'))
        setHeroVideo(data.hero_video || '')
      })
  }, [])

  function uploadWithProgress(file, path) {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', path)
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100))
      })
      xhr.addEventListener('load', () => {
        const data = JSON.parse(xhr.responseText)
        if (data.error) { reject(data.error); return }
        resolve(data.url)
      })
      xhr.addEventListener('error', () => reject('通信エラー'))
      xhr.open('POST', '/api/admin/upload')
      xhr.send(formData)
    })
  }

  async function uploadHeroImage(file) {
    setUploading('hero_bg')
    setUploadProgress(0)
    const path = `site/hero-${Date.now()}.${file.name.split('.').pop()}`
    try {
      const url = await uploadWithProgress(file, path)
      setHeroImages(imgs => [...imgs, url])
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function uploadVideo(file) {
    setUploading('hero_video')
    setUploadProgress(0)
    const path = `site/video-${Date.now()}.${file.name.split('.').pop()}`
    try {
      // 署名付きURLを取得してVercelのボディ制限を回避
      const res = await fetch('/api/admin/upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const { signedUrl, error } = await res.json()
      if (error) throw error

      // 署名付きURLに直接アップロード（大容量OK・進捗あり）
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject('アップロード失敗: ' + xhr.status)
        })
        xhr.addEventListener('error', () => reject('通信エラー'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${path}`
      setHeroVideo(publicUrl)
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/admin/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hero_bg_images: JSON.stringify(heroImages),
        hero_video: heroVideo,
      }),
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

        {/* Hero background images */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 6 }}>ヒーロー背景画像</h2>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, marginTop: 0 }}>複数枚登録するとフェードで自動切り替えされます（5秒間隔）</p>

          {heroImages.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
              {heroImages.map((url, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '3/4' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 4, left: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>
                    {i + 1}枚目
                  </div>
                  <button onClick={() => setHeroImages(imgs => imgs.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              📷 画像を追加
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={!!uploading}
                onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(f => uploadHeroImage(f)) }} />
            </label>
          </div>
          {uploading === 'hero_bg' && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
                <span>アップロード中...</span><span>{uploadProgress}%</span>
              </div>
              <div style={{ background: '#e8f4fb', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#1a3560', borderRadius: 99, width: `${uploadProgress}%`, transition: 'width 0.2s ease' }} />
              </div>
            </div>
          )}
        </section>

        {/* Hero video */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 6 }}>ヒーロー下の動画</h2>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, marginTop: 0 }}>動画ファイルまたはYouTube URLを使用できます</p>

          {heroVideo && (
            <div style={{ marginBottom: 16 }}>
              {heroVideo.includes('youtube') || heroVideo.includes('youtu.be') ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden' }}>
                  <iframe src={toEmbedUrl(heroVideo)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                </div>
              ) : (
                <video src={heroVideo} controls style={{ width: '100%', borderRadius: 10, maxHeight: 200 }} />
              )}
              <button onClick={() => setHeroVideo('')}
                style={{ marginTop: 8, background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#888' }}>
                削除
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              🎬 動画をアップロード
              <input type="file" accept="video/*" style={{ display: 'none' }} disabled={!!uploading}
                onChange={e => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
            </label>
          </div>
          {uploading === 'hero_video' && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
                <span>アップロード中...</span><span>{uploadProgress}%</span>
              </div>
              <div style={{ background: '#e8f4fb', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#1a3560', borderRadius: 99, width: `${uploadProgress}%`, transition: 'width 0.2s ease' }} />
              </div>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <input style={inp} value={heroVideo} onChange={e => setHeroVideo(e.target.value)} placeholder="またはYouTube URLを入力（例：https://youtu.be/xxxxx）" />
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
  return url
}
