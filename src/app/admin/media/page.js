'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminMediaPage() {
  const [heroImages, setHeroImages] = useState([])
  const [heroImagesMobile, setHeroImagesMobile] = useState([])
  const [heroVideo, setHeroVideo] = useState('')
  const [heroVideo2, setHeroVideo2] = useState('')
  const [missionBg, setMissionBg] = useState('')
  const [recruitImages, setRecruitImages] = useState([])
  const [recruitVideo, setRecruitVideo] = useState('')
  const [uploading, setUploading] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/site-settings').then(r => r.json()).then(data => {
      setHeroImages(JSON.parse(data.hero_bg_images || '[]'))
      setHeroImagesMobile(JSON.parse(data.hero_bg_images_mobile || '[]'))
      setHeroVideo(data.hero_video || '')
      setHeroVideo2(data.hero_video_2 || '')
      setMissionBg(data.mission_bg || '')
      setRecruitImages(JSON.parse(data.recruit_bg_images || '[]'))
      setRecruitVideo(data.recruit_bg_video || '')
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

  async function uploadVideoWithSignedUrl(file, key, setter) {
    setUploading(key)
    setUploadProgress(0)
    const path = `site/${key}-${Date.now()}.${file.name.split('.').pop()}`
    try {
      const res = await fetch('/api/admin/upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const { signedUrl, error } = await res.json()
      if (error) throw error
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
      setter(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${path}`)
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function uploadImage(file, key, setter) {
    setUploading(key)
    setUploadProgress(0)
    const path = `site/${key}-${Date.now()}.${file.name.split('.').pop()}`
    try {
      const url = await uploadWithProgress(file, path)
      setter(url)
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
        hero_bg_images_mobile: JSON.stringify(heroImagesMobile),
        hero_video: heroVideo,
        hero_video_2: heroVideo2,
        mission_bg: missionBg,
        recruit_bg_images: JSON.stringify(recruitImages),
        recruit_bg_video: recruitVideo,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }

  function ImageGrid({ images, onRemove, uploadKey, onAdd, label, aspect = '3/4' }) {
    return (
      <>
        {images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
            {images.map((url, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: aspect }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 4, left: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>{i + 1}枚目</div>
                <button onClick={() => onRemove(i)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          📷 {label}
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={!!uploading}
            onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(f => onAdd(f)) }} />
        </label>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
      </>
    )
  }

  function VideoSection({ value, onChange, uploadKey, label }) {
    const isYoutube = value.includes('youtube') || value.includes('youtu.be')
    return (
      <>
        {value && (
          <div style={{ marginBottom: 16 }}>
            {isYoutube ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden' }}>
                <iframe src={toEmbedUrl(value)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
              </div>
            ) : (
              <video src={value} controls style={{ width: '100%', borderRadius: 10, maxHeight: 200 }} />
            )}
            <button onClick={() => onChange('')}
              style={{ marginTop: 8, background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#888' }}>削除</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            🎬 {label}
            <input type="file" accept="video/*" style={{ display: 'none' }} disabled={!!uploading}
              onChange={e => e.target.files?.[0] && uploadVideoWithSignedUrl(e.target.files[0], uploadKey, onChange)} />
          </label>
        </div>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
        <div style={{ marginTop: 12 }}>
          <input style={inp} value={value} onChange={e => onChange(e.target.value)} placeholder="またはYouTube URLを入力" />
        </div>
      </>
    )
  }

  function ProgressBar({ progress }) {
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
          <span>アップロード中...</span><span>{progress}%</span>
        </div>
        <div style={{ background: '#e8f4fb', borderRadius: 99, height: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1a3560', borderRadius: 99, width: `${progress}%`, transition: 'width 0.2s ease' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Link href="/admin" style={{ color: '#888', textDecoration: 'none', fontSize: 13 }}>← 管理画面</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>メディア管理</h1>
      </div>

      {saved && <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#388e3c' }}>保存しました</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <Section title="ヒーロー背景画像（PC）" desc="複数枚登録するとフェードで自動切り替えされます（5秒間隔）">
          <ImageGrid images={heroImages} onRemove={i => setHeroImages(imgs => imgs.filter((_, idx) => idx !== i))}
            uploadKey="hero_bg" onAdd={f => { setUploading('hero_bg'); setUploadProgress(0); const path = `site/hero-${Date.now()}.${f.name.split('.').pop()}`; uploadWithProgress(f, path).then(url => { setHeroImages(imgs => [...imgs, url]); setUploading(null); setUploadProgress(0) }).catch(e => { alert(e); setUploading(null) }) }} label="画像を追加" />
        </Section>

        <Section title="ヒーロー背景画像（モバイル）" desc="スマホ用の縦長画像を設定できます。未設定の場合はPC用が使用されます">
          <ImageGrid images={heroImagesMobile} onRemove={i => setHeroImagesMobile(imgs => imgs.filter((_, idx) => idx !== i))}
            uploadKey="hero_bg_mobile" onAdd={f => { setUploading('hero_bg_mobile'); setUploadProgress(0); const path = `site/hero-mobile-${Date.now()}.${f.name.split('.').pop()}`; uploadWithProgress(f, path).then(url => { setHeroImagesMobile(imgs => [...imgs, url]); setUploading(null); setUploadProgress(0) }).catch(e => { alert(e); setUploading(null) }) }} label="画像を追加" aspect="9/16" />
        </Section>

        <Section title="ヒーロー下の動画①" desc="動画ファイルまたはYouTube URLを使用できます">
          <VideoSection value={heroVideo} onChange={setHeroVideo} uploadKey="hero_video" label="動画をアップロード" />
        </Section>

        <Section title="ヒーロー下の動画②" desc="動画①のさらに下に表示されます">
          <VideoSection value={heroVideo2} onChange={setHeroVideo2} uploadKey="hero_video_2" label="動画をアップロード" />
        </Section>

        <Section title="モデル募集セクション背景（写真 or 動画）" desc="複数枚の写真か動画を設定できます。設定するとテキストに被らないよう暗いオーバーレイが自動でかかります">
          <ImageGrid images={recruitImages} onRemove={i => setRecruitImages(imgs => imgs.filter((_, idx) => idx !== i))}
            uploadKey="recruit_bg" onAdd={f => { setUploading('recruit_bg'); setUploadProgress(0); const path = `site/recruit-${Date.now()}.${f.name.split('.').pop()}`; uploadWithProgress(f, path).then(url => { setRecruitImages(imgs => [...imgs, url]); setUploading(null); setUploadProgress(0) }).catch(e => { alert(e); setUploading(null) }) }} label="写真を追加" aspect="16/9" />
          <div style={{ margin: '16px 0 8px', fontWeight: 600, fontSize: 13, color: '#555' }}>または動画</div>
          <VideoSection value={recruitVideo} onChange={setRecruitVideo} uploadKey="recruit_video" label="動画をアップロード" />
        </Section>

        <Section title="Missionセクション背景画像" desc="「Every flower deserves to bloom.」セクションの背景に使用されます">
          {missionBg && (
            <div style={{ marginBottom: 16, position: 'relative', borderRadius: 10, overflow: 'hidden', maxHeight: 160 }}>
              <img src={missionBg} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
              <button onClick={() => setMissionBg('')}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>削除</button>
            </div>
          )}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            📷 画像をアップロード
            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!uploading}
              onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'mission_bg', setMissionBg)} />
          </label>
          {uploading === 'mission_bg' && <ProgressBar progress={uploadProgress} />}
          <div style={{ marginTop: 12 }}>
            <input style={inp} value={missionBg} onChange={e => setMissionBg(e.target.value)} placeholder="またはURLを直接入力" />
          </div>
        </Section>

      </div>

      <button onClick={save} disabled={saving}
        style={{ marginTop: 24, background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 36px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? '保存中...' : '保存する'}
      </button>
    </div>
  )
}

function Section({ title, desc, children }) {
  return (
    <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>{title}</h2>
      <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, marginTop: 0 }}>{desc}</p>
      {children}
    </section>
  )
}

function toEmbedUrl(url) {
  if (!url) return ''
  if (url.includes('youtube.com/watch')) return `https://www.youtube.com/embed/${new URL(url).searchParams.get('v')}`
  if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}`
  return url
}
