'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Cropper from 'react-easy-crop'
import { compressImage } from '@/lib/compressImage'

async function getCroppedBlob(imageSrc, pixelCrop) {
  const img = await new Promise((resolve, reject) => {
    const i = new window.Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = imageSrc
  })
  const size = Math.min(pixelCrop.width, pixelCrop.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas.getContext('2d').drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
}

export default function StaffGuidePage() {
  const [photo, setPhoto] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [uploading, setUploading] = useState(false)

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), [])

  useEffect(() => {
    fetch('/api/staff-portal/private-info')
      .then(r => r.json())
      .then(data => {
        setPhoto(data.profile_photo || '')
        setDisplayName(data.display_name || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function openCrop(file) {
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  async function confirmCrop() {
    if (!cropSrc || !croppedAreaPixels) return
    const src = cropSrc
    const pixels = croppedAreaPixels
    setCropSrc(null)
    setUploading(true)
    try {
      const blob = await getCroppedBlob(src, pixels)
      URL.revokeObjectURL(src)
      const compressed = await compressImage(new Blob([blob], { type: 'image/jpeg' }))
      const path = `staff/profile/${Date.now()}.jpg`
      const fd = new FormData()
      fd.append('file', compressed)
      fd.append('path', path)
      const res = await fetch('/api/staff-portal/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPhoto(data.url)
    } catch (e) {
      URL.revokeObjectURL(src)
      alert('アップロードエラー: ' + (e.message || String(e)))
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/staff-portal/private-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_photo: photo, display_name: displayName }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>

      {cropSrc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Cropper image={cropSrc} crop={crop} zoom={zoom} aspect={1}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          </div>
          <div style={{ background: '#1a1a2e', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, whiteSpace: 'nowrap' }}>ズーム</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#5bbfd6' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeCrop} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 14, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={confirmCrop} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#5bbfd6', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>この範囲でアップロード</button>
            </div>
          </div>
        </div>
      )}

      <Link href="/staff-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← スタッフ画面</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 4px' }}>スタッフ活動の手引き</h1>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 24 }}>準備中です。</p>

      {/* プロフィール設定 */}
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>プロフィール設定</h2>

        {/* 写真 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {photo ? (
              <>
                <Image src={photo} alt="" width={80} height={80} style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e5e5', display: 'block' }} />
                <button onClick={() => setPhoto('')}
                  style={{ position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </>
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f0f4f8', border: '2px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🐈‍⬛</div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginBottom: 4 }}>宣材写真</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>1:1の正方形にトリミングされます（任意）</div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 7, padding: '8px 16px', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: uploading ? 0.6 : 1 }}>
              {uploading ? '⏳ アップロード中...' : '📷 写真を選ぶ'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
                onChange={e => { if (e.target.files?.[0]) { openCrop(e.target.files[0]); e.target.value = '' } }} />
            </label>
          </div>
        </div>

        {/* 表示名 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>表示名</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="スタッフ画面などで表示される名前（例：たろう）"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: 12, color: '#aaa', margin: '6px 0 0' }}>本名とは別に設定できます。未入力の場合は本名が使われます。</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={handleSave} disabled={saving || loading}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 32px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : '保存する'}
          </button>
          {saved && <span style={{ fontSize: 13, color: '#388e3c', fontWeight: 600 }}>✓ 保存しました</span>}
        </div>
      </div>
    </div>
  )
}
