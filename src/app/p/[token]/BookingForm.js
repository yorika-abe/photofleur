'use client'
import { useState } from 'react'

export default function PrivateProductBookingForm({ token, paymentMethod }) {
  const [form, setForm] = useState({
    last_name: '', first_name: '', email: '', phone: '', payment_method: paymentMethod === 'both' ? 'cash' : paymentMethod, notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!form.last_name || !form.email) { setError('氏名・メールアドレスは必須です'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/bookings/private', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...form }),
    })
    setSubmitting(false)
    if (res.ok) { setDone(true) }
    else {
      const d = await res.json()
      setError(d.error === 'Out of stock' ? '申し訳ありませんが受付終了しました' : '送信に失敗しました。もう一度お試しください。')
    }
  }

  if (done) {
    return (
      <div style={{ background: '#e8f5e9', borderRadius: 14, padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: '#2e7d32', marginBottom: 8 }}>お申し込みありがとうございます</div>
        <p style={{ fontSize: 14, color: '#555' }}>担当よりご連絡いたします。</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '20px 24px' }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: '#1a3560', marginBottom: 18 }}>予約申し込み</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>姓 *</label>
          <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
            placeholder="山田" required style={inp} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={lbl}>名</label>
          <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
            placeholder="太郎" style={inp} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>メールアドレス *</label>
        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="example@email.com" required style={inp} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>電話番号（任意）</label>
        <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          placeholder="090-0000-0000" style={inp} />
      </div>

      {paymentMethod === 'both' && (
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>お支払方法 *</label>
          <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
            {[['cash', '現金払い（当日）'], ['card', '事前カード決済']].map(([v, label]) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                <input type="radio" name="pm" value={v} checked={form.payment_method === v}
                  onChange={() => setForm(f => ({ ...f, payment_method: v }))} />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>備考・ご要望（任意）</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={3} placeholder="ご質問・ご要望などあればご記入ください" style={{ ...inp, resize: 'vertical' }} />
      </div>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', borderRadius: 8, padding: '10px 14px', fontSize: 14, marginBottom: 14 }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting}
        style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: submitting ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 16, cursor: submitting ? 'not-allowed' : 'pointer' }}>
        {submitting ? '送信中...' : '申し込む'}
      </button>
    </form>
  )
}

const lbl = { display: 'block', fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }
const inp = { width: '100%', padding: '9px 11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
