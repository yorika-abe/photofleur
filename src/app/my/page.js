'use client'

import Image from 'next/image'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

async function compressImage(file, maxW = 1600, maxH = 1600, quality = 0.85) {
  return new Promise(resolve => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality)
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
  irregular: { bg: '#e3f2fd', color: '#1a3560', label: '不定期' },
  private: { bg: '#f3e5f5', color: '#7b1fa2', label: 'リクエスト撮影' },
}

function CollapseCard({ title, subtitle, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #d6ecf5', marginBottom: 16, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a3560' }}>{title}</span>
            {badge && <span style={{ fontSize: 11, background: '#e3f2fd', color: '#1565c0', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>{badge}</span>}
          </div>
          {subtitle && <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
        <span style={{ fontSize: 18, color: '#aaa', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ paddingTop: 16 }}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

function MyPageContent() {
  const searchParams = useSearchParams()
  const justLinkedLine = searchParams.get('line_linked') === '1'
  const justApplied = searchParams.get('request_applied') === '1'

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [hasLine, setHasLine] = useState(false)
  const [bookings, setBookings] = useState([])
  const [models, setModels] = useState([])
  const [form, setForm] = useState({ last_name: '', first_name: '', last_name_kana: '', first_name_kana: '', phone: '', sns_url: '', nickname: '' })
  const [emailInput, setEmailInput] = useState('')
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
  const [requestApps, setRequestApps] = useState([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirect=/my'; return }

      const [profileRes, bookingsRes, modelsRes, requestAppsRes] = await Promise.all([
        fetch('/api/customer/profile'),
        fetch('/api/customer/bookings'),
        fetch('/api/models').then(r => r.json()).catch(() => ({ models: [] })),
        fetch('/api/customer/request-applications').then(r => r.json()).catch(() => ({ applications: [] })),
      ])
      setRequestApps(requestAppsRes.applications || [])
      const { profile, email: userEmail, hasLine: hl } = await profileRes.json()
      setHasLine(hl || false)
      const { bookings } = await bookingsRes.json()

      const resolvedEmail = userEmail || user.email || ''
      setEmail(resolvedEmail)
      setEmailInput(resolvedEmail)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/customer/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: emailInput }),
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
    <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#1565c0' }}>
      ⚠️ マイページ上の登録情報を全てご記入ください。
    </div>
  )

  useEffect(() => {
    if (!loading && justApplied) {
      setTimeout(() => {
        document.getElementById('request-apps')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [loading, justApplied])

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', marginBottom: 4 }}>マイページ</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>{email}</p>

      {/* 登録情報 */}
      <CollapseCard title="登録情報" subtitle="予約フォームに自動入力されます">
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>メールアドレス</label>
            <input type="email" style={inp} value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="example@email.com" />
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
      </CollapseCard>

      {/* LINE連携 */}
      <CollapseCard title="LINE連携" subtitle="連携するとLINEでもログインできるようになります" badge={hasLine ? '連携済み' : undefined}>
        {justLinkedLine && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#388e3c' }}>
            LINEアカウントを連携しました
          </div>
        )}
        {hasLine ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#388e3c', fontWeight: 600 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#06C755"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            LINE連携済み
          </div>
        ) : (
          <a
            href="/api/auth/line?mode=link&next=/my"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#06C755', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 8px rgba(6,199,85,0.3)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            LINEと連携する
          </a>
        )}
      </CollapseCard>

      {/* 意見箱 */}
      <CollapseCard title="📮 お問い合わせ・ご意見箱" subtitle="ご意見をお聞かせください">
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
      </CollapseCard>

      {/* 写真提供 */}
      <CollapseCard title="📸 撮影データのご提供" subtitle="所属モデルのとっておきの写真を集めています！">
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.9, marginBottom: 4 }}>
          ホームページや撮影会内で使用しても良いお写真のご提供にご協力いただけましたら幸いです。
        </p>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>よろしくお願いいたします。</p>

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
                {models.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, background: photoModelIds.includes(m.id) ? '#e3f2fd' : '#f5f5f5', borderRadius: 20, padding: '6px 14px', border: photoModelIds.includes(m.id) ? '1px solid #1a3560' : '1px solid #e0e0e0' }}>
                    <input type="checkbox" checked={photoModelIds.includes(m.id)} onChange={() => toggleModel(m.id)} style={{ display: 'none' }} />
                    {m.image && <Image src={m.image} alt={m.name} width={22} height={22} style={{ borderRadius: '50%', objectFit: 'cover' }} />}
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
      </CollapseCard>

      {/* 予約履歴（直近3件） */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #d6ecf5', marginBottom: 16, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', margin: 0 }}>予約履歴</h2>
          {bookings.length > 3 && (
            <Link href="/my/bookings" style={{ fontSize: 13, color: '#1a3560', fontWeight: 600, textDecoration: 'none' }}>
              すべて見る（{bookings.length}件） →
            </Link>
          )}
        </div>
        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#bbb' }}>
            <p style={{ marginBottom: 12 }}>まだ予約履歴がありません。</p>
            <Link href="/schedule" style={{ color: '#1a3560', fontWeight: 600, fontSize: 14 }}>スケジュールを見る →</Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentBookings.map(b => {
                const tc = typeColors[b.event_type] || { bg: '#f5f5f5', color: '#888', label: '' }
                const isPaid = b.payment_method === 'card'
                const isCancelled = !!b.cancelled_at
                return (
                  <div key={`${b.booking_type || 'r'}-${b.id}`} style={{ padding: '14px 16px', borderRadius: 10, border: `1px solid ${isCancelled ? '#e0e0e0' : '#e0ecf8'}`, background: isCancelled ? '#fafafa' : '#f8fbff', opacity: isCancelled ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          {tc.label && <span style={{ fontSize: 11, background: tc.bg, color: tc.color, borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>{tc.label}</span>}
                          {isCancelled && <span style={{ fontSize: 11, background: '#ffebee', color: '#c62828', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>キャンセル済み</span>}
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{formatDate(b.event_date)}</span>
                        </div>
                        {b.event_title && <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 2 }}>{b.event_title}</div>}
                        {b.location_name && <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{b.location_name}</div>}
                        {b.slot_label && <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>{b.slot_label}</div>}
                        {b.model_name && <div style={{ fontSize: 12, color: '#888' }}>モデル：{b.model_name}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, color: '#1a3560', fontSize: 15 }}>¥{(b.final_price || 0).toLocaleString()}</div>
                        {!isCancelled && (
                          <div style={{ fontSize: 12, color: isPaid ? '#0097a7' : '#1565c0', marginTop: 2 }}>
                            {isPaid ? '💳 カード払い' : '💴 現金払い'}
                          </div>
                        )}
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
      </div>

      {/* リクエスト撮影申請 */}
      {(justApplied || requestApps.length > 0) && (
        <div id="request-apps" style={{ background: '#fff', borderRadius: 14, border: '1px solid #d6ecf5', padding: '20px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', margin: '0 0 16px' }}>リクエスト撮影申請</h2>
          {justApplied && (
            <div style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
              ✅ 申し込みを受け付けました
            </div>
          )}
          {requestApps.map(app => {
            const statusLabel = {
              pending: '申請中',
              notified: 'モデル回答待ち',
              model_responded: 'モデル回答済み・確認中',
              staff_recruiting: 'スタッフ募集中',
              confirmed: '確定',
              declined: '不可',
            }[app.status] || app.status
            const statusColor = {
              pending: '#888', notified: '#1565c0', model_responded: '#e65100',
              staff_recruiting: '#6a1b9a', confirmed: '#2e7d32', declined: '#c62828',
            }[app.status] || '#888'
            return (
              <div key={app.id} style={{ border: '1px solid #eef4f8', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a3560' }}>
                    {app.models?.map(m => m.name).join('・') || '未定'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, background: `${statusColor}18`, borderRadius: 20, padding: '3px 10px' }}>
                    {statusLabel}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                  申請日: {new Date(app.created_at).toLocaleDateString('ja-JP')}
                  {app.preferences?.[0] && ` ／ 第一希望: ${app.preferences[0].preferred_date}`}
                </p>
                {app.status === 'notified' && (
                  <p style={{ fontSize: 12, color: '#1565c0', margin: '6px 0 0' }}>
                    モデル・スタッフのスケジュールを確認のうえ、公式ラインより折り返しご連絡させていただきます。少々お待ちください。
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MyPage() {
  return (
    <Suspense>
      <MyPageContent />
    </Suspense>
  )
}
