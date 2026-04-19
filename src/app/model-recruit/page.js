'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ModelRecruitPage() {
  const [form, setForm] = useState({
    name: '', name_en: '', email: '', phone: '',
    height: '', birthday: '', bio: '', experience: '',
    instagram_url: '', twitter_url: '',
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

    const res = await fetch('/api/models/apply', {
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
          <div style={{ fontSize: 56, marginBottom: 20 }}>🌸</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', marginBottom: 12 }}>ご応募ありがとうございます</h2>
          <p style={{ color: '#666', lineHeight: 1.8, fontSize: 15 }}>
            ご応募を受け付けました。<br />
            審査結果は3〜5営業日以内にメールでご連絡いたします。
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
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#2f2244', marginBottom: 8 }}>モデル募集</h1>
      <p style={{ color: '#666', lineHeight: 1.8, marginBottom: 40, fontSize: 15 }}>
        PhotoFleurではモデルを随時募集しています。経験不問、まずはお気軽にご応募ください。
        審査後、承認された方には詳細をご連絡します。
      </p>

      {/* What to expect */}
      <div style={{ background: '#f8f5ff', borderRadius: 12, padding: '24px', marginBottom: 40, border: '1px solid #e0d5f5' }}>
        <h3 style={{ fontWeight: 700, color: '#2f2244', marginBottom: 12 }}>応募の流れ</h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: '#555', lineHeight: 2, fontSize: 14 }}>
          <li>このフォームから応募</li>
          <li>運営が審査（3〜5営業日）</li>
          <li>承認後、モデルポータルのアカウントを発行</li>
          <li>シフト提出・撮影会への参加</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '32px', border: '1px solid #e5e5e5' }}>
        {error && <div style={{ background: '#ffeef0', border: '1px solid #f5c0c5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>お名前 <span style={{ color: 'red' }}>*</span></label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required style={inputStyle} placeholder="佐藤 花子" />
          </div>
          <div>
            <label style={labelStyle}>お名前（ローマ字）</label>
            <input type="text" name="name_en" value={form.name_en} onChange={handleChange} style={inputStyle} placeholder="Hanako Sato" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>メールアドレス <span style={{ color: 'red' }}>*</span></label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required style={inputStyle} placeholder="hanako@email.com" />
          </div>
          <div>
            <label style={labelStyle}>電話番号</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} style={inputStyle} placeholder="090-1234-5678" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>身長（cm）</label>
            <input type="number" name="height" value={form.height} onChange={handleChange} style={inputStyle} placeholder="158" min="140" max="200" />
          </div>
          <div>
            <label style={labelStyle}>生年月日</label>
            <input type="date" name="birthday" value={form.birthday} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>自己紹介・PRコメント</label>
          <textarea name="bio" value={form.bio} onChange={handleChange} rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="自己紹介や撮影スタイル、得意なジャンルなどを自由にご記入ください。" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>モデル経験</label>
          <textarea name="experience" value={form.experience} onChange={handleChange} rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="モデルやコスプレ、撮影経験があればご記入ください。（経験不問です）" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <div>
            <label style={labelStyle}>Instagram URL</label>
            <input type="url" name="instagram_url" value={form.instagram_url} onChange={handleChange} style={inputStyle} placeholder="https://instagram.com/..." />
          </div>
          <div>
            <label style={labelStyle}>X（旧Twitter）URL</label>
            <input type="url" name="twitter_url" value={form.twitter_url} onChange={handleChange} style={inputStyle} placeholder="https://x.com/..." />
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#999', lineHeight: 1.7, marginBottom: 20 }}>
          ご応募いただいた情報は審査目的のみに使用し、第三者に提供することはありません。
        </p>

        <button type="submit" disabled={loading}
          style={{ width: '100%', background: '#2f2244', color: '#fff', border: 'none', borderRadius: 8, padding: '16px', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '送信中...' : '応募する'}
        </button>
      </form>
    </div>
  )
}
