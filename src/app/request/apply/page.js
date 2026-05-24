'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d0e4f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }
const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: '#556070', marginBottom: 4 }

function ApplyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const modelIdsParam = searchParams.get('model_ids') || ''
  const modelIds = modelIdsParam.split(',').filter(Boolean)

  const [models, setModels] = useState([])
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    last_name: '', first_name: '', nickname: '', email: '', phone: '', sns_url: '',
    location: '', duration_hours: '', notes: '',
    preferences: [
      { preferred_date: '', time_range: '' },
      { preferred_date: '', time_range: '' },
      { preferred_date: '', time_range: '' },
    ],
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // モデル情報取得
    if (modelIds.length > 0) {
      fetch(`/api/models?ids=${modelIds.join(',')}`)
        .then(r => r.json())
        .then(d => setModels(d.models || []))
        .catch(() => {})
    }
    // プロフィール自動入力
    fetch('/api/customer/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          setProfile(d.profile)
          setForm(f => ({
            ...f,
            last_name: d.profile.last_name || '',
            first_name: d.profile.first_name || '',
            nickname: d.profile.nickname || '',
            email: d.profile.email || '',
            phone: d.profile.phone || '',
            sns_url: d.profile.sns_url || '',
          }))
        }
      })
      .catch(() => {})
  }, [])

  function setPref(index, field, value) {
    setForm(f => {
      const prefs = [...f.preferences]
      prefs[index] = { ...prefs[index], [field]: value }
      return { ...f, preferences: prefs }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.last_name || !form.nickname || !form.email || !form.phone || !form.sns_url || !form.location) {
      setError('必須項目をすべて入力してください'); return
    }

    if (!form.duration_hours || Number(form.duration_hours) < 2) {
      setError('撮影時間は2時間以上を入力してください'); return
    }

    const filledPrefs = form.preferences.filter(p => p.preferred_date && p.time_range)
    if (filledPrefs.length === 0) { setError('希望日時を最低1つ入力してください'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/customer/request-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          model_ids: modelIds,
          preferences: filledPrefs.map(p => ({ ...p, duration_hours: Number(form.duration_hours) })),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || '送信に失敗しました'); setSubmitting(false); return }
      router.push('/my?request_applied=1')
    } catch (e) {
      setError('通信エラーが発生しました')
      setSubmitting(false)
    }
  }

  const cardStyle = { background: '#fff', borderRadius: 12, border: '1px solid #d6ecf5', padding: '24px', marginBottom: 20 }

  return (
    <div style={{ background: '#f8fbff', minHeight: '100vh', padding: 'clamp(24px, 4vw, 48px) 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', marginBottom: 8 }}>リクエスト撮影申し込み</h1>
        {models.length > 0 && (
          <p style={{ fontSize: 13, color: '#556070', marginBottom: 24 }}>
            希望モデル：{models.map(m => m.name).join('・')}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* 申込者情報 */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 16 }}>申込者情報</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>姓 *</label>
                <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="山田" required style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>名</label>
                <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="太郎" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>ニックネーム（撮影会で使用する名前）*</label>
              <input value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="例: ゆきの" required style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>メールアドレス *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="example@email.com" required style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>電話番号 *</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="090-0000-0000" required style={inp} />
            </div>
            <div>
              <label style={lbl}>SNS URL（Instagram等）*</label>
              <input value={form.sns_url} onChange={e => setForm(f => ({ ...f, sns_url: e.target.value }))} placeholder="https://www.instagram.com/..." required style={inp} />
            </div>
          </div>

          {/* 撮影場所 */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 16 }}>撮影場所</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>集合・解散場所 *（詳細な場所をご記入ください）</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="例: 渋谷駅ハチ公前" required style={inp} />
            </div>
            <div>
              <label style={lbl}>撮影時間（時間）*</label>
              <input type="number" min="2" step="0.5"
                value={form.duration_hours}
                onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
                placeholder="例: 3（2時間から受付）"
                required style={{ ...inp, maxWidth: 200 }} />
              {form.duration_hours && Number(form.duration_hours) < 2 && (
                <p style={{ fontSize: 11, color: '#c62828', margin: '4px 0 0' }}>リクエスト撮影は2時間から受け付けています</p>
              )}
            </div>
          </div>

          {/* 希望日時 */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: 16 }}>開催希望日時</h2>
            {['第一希望', '第二希望', '第三希望'].map((label, i) => (
              <div key={i} style={{ marginBottom: i < 2 ? 20 : 0, paddingBottom: i < 2 ? 20 : 0, borderBottom: i < 2 ? '1px solid #eef4f8' : 'none' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#5bbfd6', marginBottom: 10 }}>{label}{i === 0 ? ' *' : '（任意）'}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px' }}>
                    <label style={lbl}>開催日</label>
                    <input type="date" value={form.preferences[i].preferred_date}
                      onChange={e => setPref(i, 'preferred_date', e.target.value)}
                      required={i === 0} style={inp} />
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={lbl}>希望時間帯</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="time" value={form.preferences[i].time_range?.split('〜')[0] || ''}
                        onChange={e => {
                          const end = form.preferences[i].time_range?.split('〜')[1] || ''
                          setPref(i, 'time_range', e.target.value + '〜' + end)
                        }}
                        required={i === 0} style={{ ...inp, flex: 1, padding: '10px 6px' }} />
                      <span style={{ color: '#888', flexShrink: 0 }}>〜</span>
                      <input type="time" value={form.preferences[i].time_range?.split('〜')[1] || ''}
                        onChange={e => {
                          const start = form.preferences[i].time_range?.split('〜')[0] || ''
                          setPref(i, 'time_range', start + '〜' + e.target.value)
                        }}
                        required={i === 0} style={{ ...inp, flex: 1, padding: '10px 6px' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 備考 */}
          <div style={cardStyle}>
            <label style={lbl}>備考・ご要望（任意）</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="現金支払い希望の場合こちらにご記入ください"
              style={{ ...inp, minHeight: 100, resize: 'vertical' }} />
          </div>

          {error && (
            <div style={{ background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#c62828', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting}
            style={{ width: '100%', background: submitting ? '#aaa' : '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '16px', fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? '送信中...' : '申し込む'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function RequestApplyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>読み込み中...</div>}>
      <ApplyForm />
    </Suspense>
  )
}
