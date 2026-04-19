'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RequestPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    preferred_date: '', preferred_time: '',
    location_preference: '', model_preference: '',
    description: '', budget: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      setError('送信に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '48px 32px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>📸</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', marginBottom: 12 }}>リクエストを受け付けました</h2>
          <p style={{ color: '#666', lineHeight: 1.8, fontSize: 15 }}>
            ご要望を受け付けました。<br />
            担当者より3営業日以内にご連絡いたします。
          </p>
          <Link href="/" style={{ display: 'inline-block', marginTop: 24, background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 600 }}>トップページへ戻る</Link>
        </div>
      </div>
    )
  }

  const inputStyle = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#333' }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#2f2244', marginBottom: 8 }}>リクエスト撮影</h1>
      <p style={{ color: '#666', lineHeight: 1.8, marginBottom: 40, fontSize: 15 }}>
        定期イベント以外にも、ご希望のロケーション・スタイル・モデルでカスタム撮影が可能です。
        詳細をお知らせください。
      </p>

      <div style={{ background: '#f8f5ff', borderRadius: 12, padding: '24px', marginBottom: 40, border: '1px solid #e0d5f5' }}>
        <h3 style={{ fontWeight: 700, color: '#2f2244', marginBottom: 12 }}>リクエスト撮影とは？</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#555', lineHeight: 2, fontSize: 14 }}>
          <li>希望の日程・場所・モデルで撮影</li>
          <li>人数・時間帯など柔軟に対応</li>
          <li>プライベートな撮影会として開催</li>
          <li>料金はリクエスト内容により異なります</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '32px', border: '1px solid #e5e5e5' }}>
        {error && <div style={{ background: '#ffeef0', border: '1px solid #f5c0c5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>お名前 <span style={{ color: 'red' }}>*</span></label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required style={inputStyle} placeholder="山田 太郎" />
          </div>
          <div>
            <label style={labelStyle}>メールアドレス <span style={{ color: 'red' }}>*</span></label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required style={inputStyle} placeholder="taro@email.com" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>電話番号</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} style={inputStyle} placeholder="090-1234-5678" />
          </div>
          <div>
            <label style={labelStyle}>ご希望の日程</label>
            <input type="date" name="preferred_date" value={form.preferred_date} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>ご希望の時間帯</label>
            <select name="preferred_time" value={form.preferred_time} onChange={handleChange} style={inputStyle}>
              <option value="">選択してください</option>
              <option value="morning">午前（10:00〜12:00）</option>
              <option value="afternoon">午後（13:00〜17:00）</option>
              <option value="evening">夕方（17:00〜20:00）</option>
              <option value="flexible">いつでも可</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>ご予算（目安）</label>
            <select name="budget" value={form.budget} onChange={handleChange} style={inputStyle}>
              <option value="">選択してください</option>
              <option value="under_10000">〜10,000円</option>
              <option value="10000_30000">10,000〜30,000円</option>
              <option value="30000_50000">30,000〜50,000円</option>
              <option value="over_50000">50,000円以上</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>希望ロケーション・場所のイメージ</label>
          <input type="text" name="location_preference" value={form.location_preference} onChange={handleChange} style={inputStyle} placeholder="例：渋谷周辺のカフェ、スタジオ、公園など" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>希望のモデル（いれば）</label>
          <input type="text" name="model_preference" value={form.model_preference} onChange={handleChange} style={inputStyle} placeholder="例：モデル名、タイプや雰囲気など" />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={labelStyle}>撮影内容・その他ご要望 <span style={{ color: 'red' }}>*</span></label>
          <textarea name="description" value={form.description} onChange={handleChange} required rows={5}
            style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="撮影の目的、ご希望のスタイル、人数など自由にご記入ください。" />
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', background: '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '16px', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '送信中...' : 'リクエストを送る'}
        </button>
      </form>
    </div>
  )
}
