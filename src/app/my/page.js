'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

async function compressImage(file, maxW = 1600, maxH = 1600, quality = 0.85) {
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

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

const typeColors = {
  street: { bg: '#e0f7fa', color: '#0097a7', label: 'ストリート' },
  studio: { bg: '#fce4ec', color: '#c2185b', label: 'スタジオ' },
  irregular: { bg: '#e8eaf6', color: '#1a3560', label: '不定期' },
}

export default function MyPage() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [bookings, setBookings] = useState([])
  const [models, setModels] = useState([])
  const [form, setForm] = useState({ last_name: '', first_name: '', last_name_kana: '', first_name_kana: '', phone: '', sns_url: '', nickname: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedProfile, setSavedProfile] = useState({})
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoModelIds, setPhotoModelIds] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [uploadCount, setUploadCount] = useState({ current: 0, total: 0 })
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackDone, setFeedbackDone] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirect=/my'; return }

      const [profileRes, bookingsRes, modelsRes] = await Promise.all([
        fetch('/api/customer/profile'),
        fetch('/api/customer/bookings'),
        fetch('/api/admin/models').then(r => r.json()).catch(() => ({ models: [] })),
      ])
      const { profile, email: userEmail } = await profileRes.json()
      const { bookings } = await bookingsRes.json()

      setEmail(userEmail || user.email || '')
      setBookings(bookings || [])
      setModels(modelsRes.models || [])
      if (profile) {
        const p = {
          last_name: profile.last_name || '',
          first_name: profile.first_name || '',
          last_name_kana: profile.last_name_kana || '',
          first_name_kana: profile.first_name_kana || '',
          phone: profile.phone || '',
          sns_url: profile.sns_url || '',
          nickname: profile.nickname || '',
        }
        setForm(p)
        setSavedProfile(p)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/customer/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setSavedProfile(form)
    setTimeout(() => setSaved(false), 3000)
  }

  async function uploadPhotos(e) {
    e.preventDefault()
    if (photoFiles.length === 0) return
    setUploading(true)
    setUploadCount({ current: 0, total: photoFiles.length })
    const fd = new FormData()
    for (let i = 0; i < photoFiles.length; i++) {
      setUploadCount({ current: i + 1, total: photoFiles.length })
      const compressed = await compressImage(photoFiles[i], 1600, 1600, 0.85)
      fd.append('files', compressed)
    }
    fd.append('model_ids', JSON.stringify(photoModelIds))
    fd.append('sns_url', form.sns_url || '')
    const res = await fetch('/api/customer/contributed-photos', { method: 'POST', body: fd })
    const json = await res.json()
    setUploading(false)
    if (!res.ok || json.error) {
      alert('アップロードに失敗しました: ' + (json.error || res.status))
      return
    }
    setUploadDone(true)
    setPhotoFiles([])
    setPhotoModelIds([])
    setTimeout(() => setUploadDone(false), 4000)
  }

  async function submitFeedback(e) {
    e.preventDefault()
    if (!feedbackContent.trim()) return
    setFeedbackSending(true)
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: feedbackContent }),
    })
    setFeedbackSending(false)
    if (res.ok) { setFeedbackDone(true); setFeedbackContent(''); setTimeout(() => setFeedbackDone(false), 4000) }
  }

  function toggleModel(id) {
    setPhotoModelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
  const recentBookings = bookings.slice(0, 3)
  const profileComplete = !!(savedProfile.last_name && savedProfile.first_name && savedProfile.last_name_kana && savedProfile.first_name_kana && savedProfile.phone && savedProfile.sns_url)
  const profileIncompleteNotice = (
    <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#795548' }}>
      ⚠️ マイページ上の登録情報を全てご記入ください。
    </div>
  )

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>マイページ</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 32 }}>{email}</p>

      {/* 登録情報 */}
      <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5', marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 4 }}>登録情報</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>予約フォームに自動入力されます</p>
        {saved && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#388e3c' }}>保存しました</div>
        )}
        <form onSubmit={save}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>姓</label><input style={inp} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="山田" /></div>
            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>名</label><input style={inp} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="太郎" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>姓（カナ）</label><input style={inp} value={form.last_name_kana} onChange={e => setForm(f => ({ ...f, last_name_kana: e.target.value }))} placeholder="ヤマダ" /></div>
            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>名（カナ）</label><input style={inp} value={form.first_name_kana} onChange={e => setForm(f => ({ ...f, first_name_kana: e.target.value }))} placeholder="タロウ" /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>ニックネーム</label>
            <input style={inp} value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="撮影会で使用する名前" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>電話番号</label>
            <input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="090-0000-0000" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>SNS URL（Instagram / X など）</label>
            <input style={inp} value={form.sns_url} onChange={e => setForm(f => ({ ...f, sns_url: e.target.value }))} placeholder="https://instagram.com/..." />
          </div>
          <button type="submit" disabled={saving} style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : '保存する'}
          </button>
        </form>
      </section>

      {/* 意見箱 */}
      <section style={{ background: '#f8fbff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5', marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 8 }}>📮 ご意見箱</h2>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8, margin: '0 0 8px' }}>
          PhotoFleurでは日々改善・改良を重ね邁進しております。ご意見をお聞かせください。
        </p>
        <ul style={{ fontSize: 12, color: '#888', lineHeight: 2, paddingLeft: 18, margin: '0 0 8px' }}>
          <li>PhotoFleurで開催したいイベント</li>
          <li>おすすめの撮影場所</li>
          <li>撮影会のシステム的な問題・改善点</li>
          <li>その他ご意見</li>
        </ul>
        <p style={{ fontSize: 11, color: '#bbb', margin: '0 0 14px' }}>※送信専用ですので、返答が必要なものは公式LINEよりお願いいたします。</p>
        {!profileComplete ? profileIncompleteNotice : (<>
          {feedbackDone && (
            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#388e3c' }}>
              ありがとうございます！送信されました。
            </div>
          )}
          <form onSubmit={submitFeedback}>
            <textarea value={feedbackContent} onChange={e => setFeedbackContent(e.target.value)}
              placeholder="ご自由にお書きください..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', minHeight: 90, resize: 'vertical', marginBottom: 12 }} />
            <button type="submit" disabled={feedbackSending || !feedbackContent.trim()}
              style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (!feedbackContent.trim() || feedbackSending) ? 0.6 : 1 }}>
              {feedbackSending ? '送信中...' : '送信する'}
            </button>
          </form>
        </>)}
      </section>

      {/* 写真提供 */}
      <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5', marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 8 }}>📸 撮影データのご提供</h2>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.9, marginBottom: 4 }}>
          所属モデルのとっておきの写真を集めています！<br />
          ホームページや撮影会内で使用しても良いお写真のご提供にご協力いただけましたら幸いです。
        </p>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>よろしくお願いいたします。</p>

        {!profileComplete ? profileIncompleteNotice : (<>
        {uploadDone && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#388e3c' }}>
            ありがとうございます！写真を受け取りました。
          </div>
        )}

        <form onSubmit={uploadPhotos}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#555' }}>写真を選択（複数可）</label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#e0f2fe', color: '#0369a1', border: '2px dashed #0369a1', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600 }}>
              📁 ファイルを追加する
              <input type="file" accept="image/*" multiple onChange={e => setPhotoFiles(prev => [...prev, ...Array.from(e.target.files)])} style={{ display: 'none' }} />
            </label>
            {photoFiles.length > 0 ? (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontSize: 13, color: '#0369a1', fontWeight: 600, margin: 0 }}>✅ {photoFiles.length}枚選択中</p>
                <button type="button" onClick={() => setPhotoFiles([])} style={{ fontSize: 12, color: '#e53935', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ クリア</button>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>選択されていません（複数回タップして追加できます）</p>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#555' }}>写っているモデル（複数選択可）</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {models.filter(m => m.status === 'active').map(m => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, background: photoModelIds.includes(m.id) ? '#e8eaf6' : '#f5f5f5', borderRadius: 20, padding: '6px 14px', border: photoModelIds.includes(m.id) ? '1px solid #1a3560' : '1px solid #e0e0e0' }}>
                  <input type="checkbox" checked={photoModelIds.includes(m.id)} onChange={() => toggleModel(m.id)} style={{ display: 'none' }} />
                  {m.image && <img src={m.image} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />}
                  <span style={{ color: photoModelIds.includes(m.id) ? '#1a3560' : '#555', fontWeight: photoModelIds.includes(m.id) ? 700 : 400 }}>{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          {form.sns_url && (
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 16px' }}>クレジット表記：登録済みSNS URL（{form.sns_url}）を使用します</p>
          )}

          <button type="submit" disabled={uploading || photoFiles.length === 0}
            style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: photoFiles.length === 0 ? 'not-allowed' : 'pointer', opacity: (uploading || photoFiles.length === 0) ? 0.6 : 1 }}>
            {uploading ? `アップロード中${uploadCount.total > 1 ? ` ${uploadCount.current} / ${uploadCount.total}` : ''}...` : '送信する'}
          </button>
        </form>
        </>)}
      </section>

      {/* 予約履歴（直近3件） */}
      <section style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #d6ecf5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a3560', margin: 0 }}>予約履歴</h2>
          {bookings.length > 3 && (
            <Link href="/my/bookings" style={{ fontSize: 13, color: '#1a3560', fontWeight: 600, textDecoration: 'none' }}>
              すべて見る（{bookings.length}件） →
            </Link>
          )}
        </div>
        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#bbb' }}>
            <p style={{ marginBottom: 16 }}>まだ予約履歴がありません。</p>
            <Link href="/schedule" style={{ color: '#1a3560', fontWeight: 600, fontSize: 14 }}>スケジュールを見る →</Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentBookings.map(b => {
                const tc = typeColors[b.event_type] || { bg: '#f5f5f5', color: '#888', label: '' }
                const isPaid = b.payment_method === 'card'
                return (
                  <div key={b.id} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #e0ecf8', background: '#f8fbff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          {tc.label && <span style={{ fontSize: 11, background: tc.bg, color: tc.color, borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>{tc.label}</span>}
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{formatDate(b.event_date)}</span>
                        </div>
                        {b.event_title && <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 2 }}>{b.event_title}</div>}
                        {b.location_name && <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{b.location_name}</div>}
                        <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>{b.slot_label}</div>
                        {b.model_name && <div style={{ fontSize: 12, color: '#888' }}>モデル：{b.model_name}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, color: '#1a3560', fontSize: 15 }}>¥{(b.final_price || 0).toLocaleString()}</div>
                        <div style={{ fontSize: 12, color: isPaid ? '#0097a7' : '#e65100', marginTop: 2 }}>
                          {isPaid ? '💳 カード払い' : '💴 現金払い'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {bookings.length > 3 && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Link href="/my/bookings" style={{ fontSize: 13, color: '#1a3560', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #1a3560', paddingBottom: 2 }}>
                  すべての予約履歴を見る（{bookings.length}件） →
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
