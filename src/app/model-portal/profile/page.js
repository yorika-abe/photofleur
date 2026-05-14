'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Cropper from 'react-easy-crop'

async function getCroppedBlob(imageSrc, pixelCrop, quality = 0.85, maxW = 1200, maxH = 1500) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = imageSrc
  })
  let dstW = pixelCrop.width, dstH = pixelCrop.height
  if (dstW > maxW) { dstH = dstH * (maxW / dstW); dstW = maxW }
  if (dstH > maxH) { dstW = dstW * (maxH / dstH); dstH = maxH }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(dstW)
  canvas.height = Math.round(dstH)
  canvas.getContext('2d').drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, canvas.width, canvas.height)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
}

function compressToJpeg(file, maxW, maxH, quality = 0.85) {
  return new Promise(resolve => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      let dstW = img.width, dstH = img.height
      if (dstW > maxW) { dstH = dstH * (maxW / dstW); dstW = maxW }
      if (dstH > maxH) { dstW = dstW * (maxH / dstH); dstH = maxH }
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(dstW)
      canvas.height = Math.round(dstH)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', quality)
    }
    img.src = blobUrl
  })
}

export default function ModelProfilePage() {
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [form, setForm] = useState({
    name: '', name_en: '', bio: '', height: '', birthday: '', shoe_size: '',
    image: '', twitter_url: '', instagram_url: '', favorite_things: '',
  })
  const [portfolioImages, setPortfolioImages] = useState([])
  const [message, setMessage] = useState('')

  // Crop modal state
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

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
        const pd = model.pending_data
        const pick = (key) => pd ? (pd[key] ?? model[key]) : model[key]
        setForm({
          name: pick('name') || '',
          name_en: pick('name_en') || '',
          bio: pick('bio') || '',
          height: pick('height') || '',
          birthday: (pick('birthday') || '').replace(/\//g, '-'),
          shoe_size: pick('shoe_size') || '',
          image: pick('image') || '',
          twitter_url: pick('twitter_url') || '',
          instagram_url: pick('instagram_url') || '',
          favorite_things: pick('favorite_things') || '',
        })
        setPortfolioImages((pd ? (pd.portfolio_images ?? model.portfolio_images) : model.portfolio_images) || [])
      }
      setLoading(false)
    }
    init()
  }, [])

  async function uploadViaSignedUrl(file, path) {
    const res = await fetch('/api/model-portal/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, contentType: file.type }),
    })
    const { signedUrl, publicUrl, error } = await res.json()
    if (error) throw new Error(error)
    const putRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!putRes.ok) throw new Error('アップロード失敗: ' + putRes.status)
    return publicUrl
  }

  function openCropModal(file) {
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  function closeCropModal() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function confirmCrop() {
    if (!cropSrc || !croppedAreaPixels) return
    const src = cropSrc
    const pixels = croppedAreaPixels
    setCropSrc(null) // モーダルを閉じるがURLはまだ revoke しない
    setUploading(true)
    try {
      const blob = await getCroppedBlob(src, pixels, 0.85, 1200, 1500)
      URL.revokeObjectURL(src)
      const file = new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const path = `models/${file.name}`
      const url = await uploadViaSignedUrl(file, path)
      setForm(f => ({ ...f, image: url }))
    } catch (e) {
      URL.revokeObjectURL(src)
      alert('アップロード失敗: ' + (e.message || String(e)))
    } finally {
      setUploading(false)
    }
  }

  async function uploadPortfolioImages(files) {
    const fileArr = Array.from(files)
    setUploading(true)
    setUploadProgress(`1 / ${fileArr.length}`)
    const uploaded = []
    try {
      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i]
        setUploadProgress(`${i + 1} / ${fileArr.length}`)
        try {
          const compressed = await compressToJpeg(file, 1600, 1600, 0.85)
          const path = `models/portfolio-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
          const url = await uploadViaSignedUrl(compressed, path)
          uploaded.push(url)
        } catch (e) {
          alert(`(${i + 1}枚目) アップロード失敗: ${e.message}`)
        }
      }
      if (uploaded.length > 0) setPortfolioImages(prev => [...prev, ...uploaded])
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
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
      setTimeout(() => { window.location.href = '/model-portal' }, 2000)
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
    : model.status === 'pending' ? { text: '承認待ち', color: '#c62828', bg: '#ffebee' }
    : { text: '非公開', color: '#999', bg: '#f5f5f5' }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>

      {/* Crop modal */}
      {cropSrc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={4 / 5}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div style={{ background: '#1a1a2e', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, whiteSpace: 'nowrap' }}>ズーム</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#5bbfd6' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeCropModal}
                style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={confirmCrop}
                style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#5bbfd6', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                この範囲でアップロード
              </button>
            </div>
          </div>
        </div>
      )}

      <a href="/model-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 12 }}>← モデルポータル</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: 0 }}>マイプロフィール</h1>
        <span style={{ background: statusLabel.bg, color: statusLabel.color, borderRadius: 6, padding: '4px 14px', fontSize: 13, fontWeight: 600 }}>
          {statusLabel.text}
        </span>
      </div>

      {model.status === 'pending' && (
        <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1565c0', lineHeight: 1.7 }}>
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
            <div>{lbl('芸名', true)}<input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>{lbl('英字名')}<input style={inp} value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Hanako Yamada" /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            {lbl('自己紹介・プロフィール（200字程度）')}
            <textarea style={{ ...inp, resize: 'vertical' }} rows={4} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="自己紹介を書いてください..." />
            <div style={{ fontSize: 12, color: (form.bio || '').replace(/[\s\n\r]/g, '').length > 200 ? '#e53935' : '#888', marginTop: 4, textAlign: 'right' }}>
              {(form.bio || '').replace(/[\s\n\r]/g, '').length} 字（改行・空白除く）
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>{lbl('身長（cm）')}<input type="number" style={inp} value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} /></div>
            <div>{lbl('誕生日')}<input type="date" style={inp} value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} /></div>
            <div>{lbl('靴サイズ')}<input style={inp} value={form.shoe_size} onChange={e => setForm(f => ({ ...f, shoe_size: e.target.value }))} placeholder="24.0cm" /></div>
          </div>
          <div>
            {lbl('好きなもの・趣味')}
            <input style={inp} value={form.favorite_things} onChange={e => setForm(f => ({ ...f, favorite_things: e.target.value }))} placeholder="カフェ巡り、読書..." />
          </div>
        </section>

        {/* Profile image */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>プロフィール画像</h2>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, marginTop: 0 }}>4:5（縦長）にトリミングして保存されます</p>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {form.image && (
              <div style={{ width: 100, height: 125, borderRadius: 10, overflow: 'hidden', background: '#d6ecf5', flexShrink: 0, position: 'relative' }}>
                <img src={form.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setForm(f => ({ ...f, image: '' }))}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13 }}>×</button>
              </div>
            )}
            <div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '12px 20px', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: uploading ? 0.6 : 1 }}>
                📷 写真を選ぶ
                <input type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) { openCropModal(e.target.files[0]); e.target.value = '' } }} />
              </label>
              {uploading && <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>アップロード中...</p>}
            </div>
          </div>
        </section>

        {/* SNS */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 18 }}>SNS（公開アカウントのみ）</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>{lbl('X / Twitter URL（撮影会用に作成したアカウント）')}<input style={inp} value={form.twitter_url} onChange={e => setForm(f => ({ ...f, twitter_url: e.target.value }))} placeholder="https://x.com/..." /></div>
            <div>{lbl('Instagram URL（宣伝したいアカウントがある人は入力）')}<input style={inp} value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))} placeholder="https://instagram.com/..." /></div>
          </div>
        </section>

        {/* Portfolio */}
        <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #e5e5e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 6 }}>ポートフォリオ画像</h2>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>複数枚まとめて選択できます（最初に入れておくものはバストアップ・全身写真で加工の少ないもの）</p>

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
          {uploading && <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>アップロード中...{uploadProgress ? ` (${uploadProgress}枚目)` : ''}</p>}
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
