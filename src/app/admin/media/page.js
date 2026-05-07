'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

async function compressImage(file, maxW = 2000, maxH = 2000, quality = 0.88) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })), 'image/jpeg', quality)
    }
    img.src = url
  })
}

const TABS = [
  { id: 'home', label: 'HOME' },
  { id: 'request', label: 'リクエスト撮影' },
  { id: 'recruit_page', label: 'モデル募集' },
  { id: 'ogp', label: '共有画像設定(OGP)' },
  { id: 'onboarding', label: 'モデル登録手続き' },
]

const OGP_PAGES = [
  { key: 'ogp_home', label: 'HOME' },
  { key: 'ogp_schedule', label: 'スケジュール一覧' },
  { key: 'ogp_models', label: 'モデル一覧' },
  { key: 'ogp_blog', label: 'ブログ一覧' },
  { key: 'ogp_request', label: 'リクエスト撮影' },
  { key: 'ogp_recruit', label: 'モデル募集' },
  { key: 'ogp_goods', label: 'グッズ' },
  { key: 'ogp_faq', label: 'FAQ' },
]

export default function AdminMediaPage() {
  const [tab, setTab] = useState('home')
  const [heroImages, setHeroImages] = useState([])
  const [heroImagesMobile, setHeroImagesMobile] = useState([])
  const [heroVideo, setHeroVideo] = useState('')
  const [heroVideo2, setHeroVideo2] = useState('')
  const [missionBg, setMissionBg] = useState('')
  const [recruitImages, setRecruitImages] = useState([])
  const [requestHeroImages, setRequestHeroImages] = useState([])
  const [recruitHeroImages, setRecruitHeroImages] = useState([])
  const [ogpImages, setOgpImages] = useState({})
  const [uploading, setUploading] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadCount, setUploadCount] = useState({ current: 0, total: 0 })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [onboardingPdfAbout, setOnboardingPdfAbout] = useState('')
  const [onboardingPdfRegist, setOnboardingPdfRegist] = useState('')

  useEffect(() => {
    fetch('/api/admin/site-settings').then(r => r.json()).then(data => {
      setHeroImages(JSON.parse(data.hero_bg_images || '[]'))
      setHeroImagesMobile(JSON.parse(data.hero_bg_images_mobile || '[]'))
      setHeroVideo(data.hero_video || '')
      setHeroVideo2(data.hero_video_2 || '')
      setMissionBg(data.mission_bg || '')
      setRecruitImages(JSON.parse(data.recruit_bg_images || '[]'))
      const rhi = data.request_hero_image || ''
      try { const p = JSON.parse(rhi); setRequestHeroImages(Array.isArray(p) ? p : (rhi ? [rhi] : [])) } catch { setRequestHeroImages(rhi ? [rhi] : []) }
      const mhi = data.recruit_hero_image || ''
      try { const p = JSON.parse(mhi); setRecruitHeroImages(Array.isArray(p) ? p : (mhi ? [mhi] : [])) } catch { setRecruitHeroImages(mhi ? [mhi] : []) }
      const ogp = {}
      for (const { key } of OGP_PAGES) ogp[key] = data[key] || ''
      setOgpImages(ogp)
      setOnboardingPdfAbout(data.onboarding_pdf_about || '')
      setOnboardingPdfRegist(data.onboarding_pdf_regist || '')
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

  async function uploadWithSignedUrl(file, key, onSuccess, oldUrl) {
    setUploading(key)
    setUploadProgress(0)
    try {
      const compressed = await compressImage(file, 2000, 2000, 0.88)
      const path = `site/${key}-${Date.now()}.jpg`
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
        xhr.setRequestHeader('Content-Type', 'image/jpeg')
        xhr.send(compressed)
      })
      onSuccess(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${path}`)
      if (oldUrl) deleteFile(oldUrl)
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
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

  async function deleteFile(url) {
    if (!url || !url.includes('/storage/v1/object/public/images/')) return
    await fetch('/api/admin/delete-storage-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  }

  async function uploadImage(file, key, setter, oldUrl) {
    setUploading(key)
    setUploadProgress(0)
    try {
      const compressed = await compressImage(file, 2000, 2000, 0.88)
      const path = `site/${key}-${Date.now()}.jpg`
      const url = await uploadWithProgress(compressed, path)
      setter(url)
      if (oldUrl) deleteFile(oldUrl)
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function uploadPdf(file, key, setter) {
    setUploading(key)
    setUploadProgress(0)
    const path = `site/${key}-${Date.now()}.pdf`
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
        xhr.setRequestHeader('Content-Type', 'application/pdf')
        xhr.send(file)
      })
      setter(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${path}`)
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
        request_hero_image: JSON.stringify(requestHeroImages),
        recruit_hero_image: JSON.stringify(recruitHeroImages),
        ...ogpImages,
        onboarding_pdf_about: onboardingPdfAbout,
        onboarding_pdf_regist: onboardingPdfRegist,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }

  function ProgressBar({ progress }) {
    const multi = uploadCount.total > 1
    const barW = multi ? Math.round((uploadCount.current / uploadCount.total) * 100) : progress
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 3 }}>
          <span>アップロード中{multi ? ` ${uploadCount.current} / ${uploadCount.total}` : ''}...</span>
          {!multi && <span>{progress}%</span>}
        </div>
        <div style={{ background: '#e8f4fb', borderRadius: 99, height: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1a3560', borderRadius: 99, width: `${barW}%`, transition: 'width 0.2s ease' }} />
        </div>
      </div>
    )
  }

  function MediaGrid({ items, onRemove, uploadKey, onAddImage, onAddVideo, aspect = '16/9' }) {
    const isVid = url => /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url)
    return (
      <>
        {items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 12 }}>
            {items.map((url, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio: aspect }}>
                {isVid(url) ? (
                  <video src={url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div style={{ position: 'absolute', top: 3, left: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>{i + 1}{isVid(url) ? ' 🎬' : ''}</div>
                <button onClick={() => onRemove(i)}
                  style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            📷 写真を追加（複数可）
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={!!uploading}
              onChange={async e => {
                if (!e.target.files) return
                const arr = Array.from(e.target.files)
                setUploadCount({ current: 0, total: arr.length })
                for (let i = 0; i < arr.length; i++) {
                  setUploadCount({ current: i + 1, total: arr.length })
                  await onAddImage(arr[i])
                }
                setUploadCount({ current: 0, total: 0 })
              }} />
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#444', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            🎬 動画を追加
            <input type="file" accept="video/*" style={{ display: 'none' }} disabled={!!uploading}
              onChange={e => e.target.files?.[0] && onAddVideo(e.target.files[0])} />
          </label>
        </div>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
      </>
    )
  }

  function ImageGrid({ images, onRemove, uploadKey, onAdd, label, aspect = '3/4' }) {
    return (
      <>
        {images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 12 }}>
            {images.map((url, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio: aspect }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 3, left: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>{i + 1}枚目</div>
                <button onClick={() => onRemove(i)}
                  style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          📷 {label}
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={!!uploading}
            onChange={async e => {
              if (!e.target.files) return
              const arr = Array.from(e.target.files)
              setUploadCount({ current: 0, total: arr.length })
              for (let i = 0; i < arr.length; i++) {
                setUploadCount({ current: i + 1, total: arr.length })
                await onAdd(arr[i])
              }
              setUploadCount({ current: 0, total: 0 })
            }} />
        </label>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
      </>
    )
  }

  function SingleImageSection({ value, onChange, uploadKey, label }) {
    return (
      <>
        {value && (
          <div style={{ marginBottom: 12, position: 'relative', borderRadius: 8, overflow: 'hidden', maxHeight: 140 }}>
            <img src={value} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
            <button onClick={() => { deleteFile(value); onChange('') }}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}>削除</button>
          </div>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          📷 {label}
          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!uploading}
            onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], uploadKey, onChange, value)} />
        </label>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
        <div style={{ marginTop: 10 }}>
          <input style={inp} value={value} onChange={e => onChange(e.target.value)} placeholder="またはURLを直接入力" />
        </div>
      </>
    )
  }

  function VideoSection({ value, onChange, uploadKey, label }) {
    const isYoutube = value.includes('youtube') || value.includes('youtu.be')
    return (
      <>
        {value && (
          <div style={{ marginBottom: 12 }}>
            {isYoutube ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden' }}>
                <iframe src={toEmbedUrl(value)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
              </div>
            ) : (
              <video src={value} controls style={{ width: '100%', borderRadius: 8, maxHeight: 160 }} />
            )}
            <button onClick={() => onChange('')}
              style={{ marginTop: 6, background: 'none', border: '1px solid #ddd', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: '#888' }}>削除</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            🎬 {label}
            <input type="file" accept="video/*" style={{ display: 'none' }} disabled={!!uploading}
              onChange={e => e.target.files?.[0] && uploadVideoWithSignedUrl(e.target.files[0], uploadKey, onChange)} />
          </label>
        </div>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
        <div style={{ marginTop: 10 }}>
          <input style={inp} value={value} onChange={e => onChange(e.target.value)} placeholder="またはYouTube URLを入力" />
        </div>
      </>
    )
  }

  function PdfSection({ title, desc, value, setter, uploadKey }) {
    return (
      <Section title={title} desc={desc}>
        {value && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ background: '#f5f9ff', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1a3560', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📄</span>
              <a href={value} target="_blank" rel="noreferrer" style={{ color: '#1a3560', wordBreak: 'break-all' }}>{value.split('/').pop()}</a>
            </div>
            <button onClick={() => setter('')}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: '#888' }}>削除</button>
          </div>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          📄 PDFをアップロード
          <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={!!uploading}
            onChange={e => e.target.files?.[0] && uploadPdf(e.target.files[0], uploadKey, setter)} />
        </label>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
        <div style={{ marginTop: 10 }}>
          <input style={inp} value={value} onChange={e => setter(e.target.value)} placeholder="またはPDF URLを直接入力" />
        </div>
      </Section>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: '#888', textDecoration: 'none', fontSize: 13 }}>← 管理画面</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', margin: 0 }}>メディア管理</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e8f4fb' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '8px 18px',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? '#1a3560' : '#888',
              borderBottom: tab === t.id ? '2px solid #1a3560' : '2px solid transparent',
              marginBottom: -2,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── HOME ── */}
        {tab === 'home' && (
          <>
            <Section title="ヒーロー背景画像（PC）" desc="複数枚登録するとフェードで自動切り替えされます（5秒間隔）">
              <ImageGrid images={heroImages} onRemove={i => setHeroImages(imgs => imgs.filter((_, idx) => idx !== i))}
                uploadKey="hero_bg" onAdd={f => uploadWithSignedUrl(f, 'hero_bg', url => setHeroImages(imgs => [...imgs, url]))} label="画像を追加（複数可）" />
            </Section>

            <Section title="ヒーロー背景画像（モバイル）" desc="スマホ用の縦長画像。未設定の場合はPC用が使用されます">
              <ImageGrid images={heroImagesMobile} onRemove={i => setHeroImagesMobile(imgs => imgs.filter((_, idx) => idx !== i))}
                uploadKey="hero_bg_mobile" onAdd={f => uploadWithSignedUrl(f, 'hero_bg_mobile', url => setHeroImagesMobile(imgs => [...imgs, url]))} label="画像を追加（複数可）" aspect="9/16" />
            </Section>

            <Section title="ヒーロー下の動画①">
              <VideoSection value={heroVideo} onChange={setHeroVideo} uploadKey="hero_video" label="動画をアップロード" />
            </Section>

            <Section title="ヒーロー下の動画②" desc="動画①のさらに下に表示されます">
              <VideoSection value={heroVideo2} onChange={setHeroVideo2} uploadKey="hero_video_2" label="動画をアップロード" />
            </Section>

            <Section title="モデル募集マーキー（写真・動画）" desc="上下のスクロール行に表示される写真・動画。上段は左に、下段は右に自動スクロール">
              <MediaGrid
                items={recruitImages}
                onRemove={i => setRecruitImages(imgs => imgs.filter((_, idx) => idx !== i))}
                uploadKey="recruit_bg"
                onAddImage={f => { setUploading('recruit_bg'); setUploadProgress(0); compressImage(f, 1600, 1600, 0.85).then(c => uploadWithProgress(c, `site/recruit-${Date.now()}.jpg`)).then(url => { setRecruitImages(imgs => [...imgs, url]); setUploading(null); setUploadProgress(0) }).catch(e => { alert(e); setUploading(null) }) }}
                onAddVideo={f => uploadVideoWithSignedUrl(f, 'recruit_bg', url => setRecruitImages(imgs => [...imgs, url]))}
              />
            </Section>

            <Section title="Missionセクション背景画像" desc="「Every flower deserves to bloom.」セクションの背景">
              <SingleImageSection value={missionBg} onChange={setMissionBg} uploadKey="mission_bg" label="画像をアップロード" />
            </Section>
          </>
        )}

        {/* ── リクエスト撮影 ── */}
        {tab === 'request' && (
          <Section title="ヒーロー背景画像" desc="複数枚登録するとフェードで自動切り替えされます">
            <ImageGrid images={requestHeroImages} onRemove={i => setRequestHeroImages(imgs => imgs.filter((_, idx) => idx !== i))}
              uploadKey="request_hero" onAdd={f => uploadWithSignedUrl(f, 'request_hero', url => setRequestHeroImages(imgs => [...imgs, url]))} label="画像を追加（複数可）" aspect="16/9" />
          </Section>
        )}

        {/* ── 共有画像設定(OGP) ── */}
        {tab === 'ogp' && (
          <>
            <div style={{ background: '#fffde7', border: '1px solid #ffe082', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#795548', marginBottom: 4 }}>
              LINEやX（Twitter）でURLをシェアした時に表示される画像です。推奨サイズ：<strong>1200×630px</strong>
            </div>
            {OGP_PAGES.map(({ key, label }) => (
              <Section key={key} title={label}>
                <SingleImageSection
                  value={ogpImages[key] || ''}
                  onChange={url => setOgpImages(prev => ({ ...prev, [key]: url }))}
                  uploadKey={key}
                  label="画像をアップロード"
                />
              </Section>
            ))}
          </>
        )}

        {/* ── モデル募集 ── */}
        {tab === 'recruit_page' && (
          <Section title="ヒーロー背景画像" desc="複数枚登録するとフェードで自動切り替えされます">
            <ImageGrid images={recruitHeroImages} onRemove={i => setRecruitHeroImages(imgs => imgs.filter((_, idx) => idx !== i))}
              uploadKey="recruit_hero" onAdd={f => uploadWithSignedUrl(f, 'recruit_hero', url => setRecruitHeroImages(imgs => [...imgs, url]))} label="画像を追加（複数可）" aspect="16/9" />
          </Section>
        )}

        {/* ── モデル登録手続き ── */}
        {tab === 'onboarding' && (
          <>
            <PdfSection title="ABOUT Photo Fleur PDF" desc="モデル登録手引きページのABOUT PHOTO FLEURセクションに表示されるPDFです"
              value={onboardingPdfAbout} setter={setOnboardingPdfAbout} uploadKey="onboarding_pdf_about" />
            <PdfSection title="撮影会登録説明 PDF" desc="モデル登録手引きページの撮影会登録説明セクションに表示されるPDFです"
              value={onboardingPdfRegist} setter={setOnboardingPdfRegist} uploadKey="onboarding_pdf_regist" />
          </>
        )}

      </div>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={save} disabled={saving}
          style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? '保存中...' : '保存する'}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: '#388e3c', fontWeight: 600 }}>✓ 保存しました</span>
        )}
      </div>
    </div>
  )
}

function Section({ title, desc, children }) {
  return (
    <section style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #d6ecf5' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: desc ? 2 : 12 }}>{title}</h2>
      {desc && <p style={{ fontSize: 11, color: '#aaa', marginBottom: 12, marginTop: 0 }}>{desc}</p>}
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
