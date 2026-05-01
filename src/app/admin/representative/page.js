'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import RichEditor from '@/components/RichEditor'
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

export default function AdminRepresentativePage() {
  const [form, setForm] = useState({ photo: '', role: '', name: '', message: '', model_id: '' })
  const [models, setModels] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Crop modal state
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(r => r.json())
      .then(data => {
        setForm({
          photo: data.rep_photo || '',
          role: data.rep_role || '',
          name: data.rep_name || '',
          message: data.rep_message || '',
          model_id: data.rep_model_id || '',
        })
      })
      .catch(() => {})
    fetch('/api/admin/models')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.models || [])
        setModels(list.filter(m => m.status === 'active'))
      })
      .catch(() => {})
  }, [])

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
    setUploading(true)
    closeCropModal()
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels, 0.85, 1200, 1500)
      const path = `site/rep-${Date.now()}.jpg`
      const formData = new FormData()
      formData.append('file', new File([blob], 'rep.jpg', { type: 'image/jpeg' }))
      formData.append('path', path)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setForm(f => ({ ...f, photo: data.url }))
    } catch (e) {
      alert('アップロードエラー: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const message = form.message
      const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rep_photo: form.photo,
          rep_role: form.role,
          rep_name: form.name,
          rep_message: message,
          rep_model_id: form.model_id,
        }),
      })
      if (!res.ok) throw new Error('保存に失敗しました')
      setForm(f => ({ ...f, message }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert('保存エラー: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  const previewText = form.message?.replace(/<[^>]+>/g, '') || ''

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>

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

      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 28px' }}>代表メッセージ管理</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 写真 */}
        <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>写真</h2>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, marginTop: 0 }}>4:5（縦長）にトリミングして保存されます</p>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {form.photo && (
              <div style={{ position: 'relative' }}>
                <img src={form.photo} alt="" style={{ width: 120, height: 150, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e5e5' }} />
                <button onClick={() => setForm(f => ({ ...f, photo: '' }))}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            )}
            <div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: uploading ? 0.6 : 1 }}>
                📷 写真をアップロード
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
                  onChange={e => { if (e.target.files?.[0]) { openCropModal(e.target.files[0]); e.target.value = '' } }} />
              </label>
              {uploading && <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>アップロード中...</p>}
              <div style={{ marginTop: 12 }}>
                <input style={inp} value={form.photo} onChange={e => setForm(f => ({ ...f, photo: e.target.value }))} placeholder="またはURLを直接入力" />
              </div>
            </div>
          </div>
        </div>

        {/* テキスト情報 */}
        <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 20 }}>テキスト情報</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>役職</label>
              <input style={inp} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="例：代表・フォトグラファー" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>名前</label>
              <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：Yorika" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>メッセージ</label>
              <RichEditor
                value={form.message}
                onChange={message => setForm(f => ({ ...f, message }))}
                uploadPath="site"
                uploadEndpoint="/api/admin/upload"
              />
              <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>最初の80文字ほどがプレビューとして表示され、「続きを読む」で全文が展開されます</p>
            </div>
          </div>
        </div>

        {/* モデルページリンク */}
        <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 6 }}>モデルページへのリンク（任意）</h2>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16, marginTop: 0 }}>運営者がモデルとして活動している場合、モデルページへのリンクを表示できます</p>
          <select style={inp} value={form.model_id} onChange={e => setForm(f => ({ ...f, model_id: e.target.value }))}>
            <option value="">リンクなし</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* プレビュー */}
        {(form.name || form.message) && (
          <div style={{ background: '#f8fbff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#888', marginTop: 0, marginBottom: 16 }}>プレビュー</h2>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {form.photo && <img src={form.photo} alt="" style={{ width: 72, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
              <div>
                {form.role && <div style={{ fontSize: 11, color: '#5bbfd6', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 2 }}>{form.role}</div>}
                {form.name && <div style={{ fontSize: 18, fontWeight: 700, color: '#0d1f3a', marginBottom: 8 }}>{form.name}</div>}
                {previewText && (
                  <p style={{ fontSize: 13, color: '#555', lineHeight: 1.9, margin: 0 }}>
                    {previewText.slice(0, 80)}{previewText.length > 80 ? '...' : ''}
                    {previewText.length > 80 && <span style={{ color: '#5bbfd6', fontSize: 12, marginLeft: 8 }}>続きを読む</span>}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={save} disabled={saving}
          style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 48px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? '保存中...' : '保存する'}
        </button>
        {saved && (
          <span style={{ fontSize: 14, color: '#388e3c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ 保存しました
          </span>
        )}
      </div>
    </div>
  )
}
