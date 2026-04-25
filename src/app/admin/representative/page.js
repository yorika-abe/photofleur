'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AdminRepresentativePage() {
  const [form, setForm] = useState({ photo: '', role: '', name: '', message: '', model_id: '' })
  const [models, setModels] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/site-settings').then(r => r.json()).then(data => {
      setForm({
        photo: data.rep_photo || '',
        role: data.rep_role || '',
        name: data.rep_name || '',
        message: data.rep_message || '',
        model_id: data.rep_model_id || '',
      })
    })
    fetch('/api/admin/models').then(r => r.json()).then(({ models }) => {
      setModels((models || []).filter(m => m.status === 'active'))
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

  async function uploadPhoto(file) {
    setUploading(true)
    setUploadProgress(0)
    const path = `site/rep-${Date.now()}.${file.name.split('.').pop()}`
    try {
      const url = await uploadWithProgress(file, path)
      setForm(f => ({ ...f, photo: url }))
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(false)
    setUploadProgress(0)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/admin/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rep_photo: form.photo,
        rep_role: form.role,
        rep_name: form.name,
        rep_message: form.message,
        rep_model_id: form.model_id,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/admin" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '16px 0 28px' }}>代表メッセージ管理</h1>

      {saved && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#388e3c' }}>
          保存しました
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 写真 */}
        <div style={{ background: '#fff', border: '1px solid #d6ecf5', borderRadius: 14, padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 16 }}>写真</h2>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {form.photo && (
              <div style={{ position: 'relative' }}>
                <img src={form.photo} alt="" style={{ width: 120, height: 150, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e5e5' }} />
                <button onClick={() => setForm(f => ({ ...f, photo: '' }))}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            )}
            <div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a3560', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                📷 写真をアップロード
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
                  onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              </label>
              {uploading && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
                    <span>アップロード中...</span><span>{uploadProgress}%</span>
                  </div>
                  <div style={{ background: '#e8f4fb', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#1a3560', borderRadius: 99, width: `${uploadProgress}%`, transition: 'width 0.2s ease' }} />
                  </div>
                </div>
              )}
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
              <textarea style={{ ...inp, minHeight: 200, resize: 'vertical', lineHeight: 1.8 }}
                value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="ホームページに表示するメッセージを入力してください。最初の80文字ほどがプレビューとして表示され、「続きを読む」で全文が展開されます。" />
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
                {form.message && (
                  <p style={{ fontSize: 13, color: '#555', lineHeight: 1.9, margin: 0 }}>
                    {form.message.slice(0, 80)}{form.message.length > 80 ? '...' : ''}
                    {form.message.length > 80 && <span style={{ color: '#5bbfd6', fontSize: 12, marginLeft: 8, cursor: 'pointer' }}>続きを読む</span>}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      <button onClick={save} disabled={saving}
        style={{ marginTop: 24, background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 48px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? '保存中...' : '保存する'}
      </button>
    </div>
  )
}
