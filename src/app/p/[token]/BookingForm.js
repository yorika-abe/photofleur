'use client'
import { useState, useEffect, useRef } from 'react'

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || ''

export default function PrivateProductBookingForm({ token, paymentMethod, price = 0 }) {
  const [form, setForm] = useState({
    last_name: '', first_name: '', email: '', phone: '',
    payment_method: paymentMethod === 'both' ? 'card' : paymentMethod,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [squareReady, setSquareReady] = useState(false)
  const cardRef = useRef(null)
  const paymentsRef = useRef(null)

  const selectedPayment = form.payment_method

  useEffect(() => {
    if (selectedPayment === 'card') {
      loadSquareSDK()
    }
  }, [selectedPayment])

  async function loadSquareSDK() {
    if (squareReady) return
    if (window.Square) { await initCard(); return }
    const script = document.createElement('script')
    script.src = 'https://web.squarecdn.com/v1/square.js'
    script.onload = initCard
    document.head.appendChild(script)
  }

  async function initCard() {
    try {
      if (!SQUARE_APP_ID) return
      await new Promise(r => setTimeout(r, 300))
      if (!document.getElementById('card-container-private')) return
      const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID)
      paymentsRef.current = payments
      const card = await payments.card()
      await card.attach('#card-container-private')
      cardRef.current = card
      setSquareReady(true)
    } catch {
      setError('カード入力フォームの初期化に失敗しました。当日現金をお選びください。')
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.last_name || !form.email) { setError('氏名・メールアドレスは必須です'); return }
    setSubmitting(true)
    setError('')

    let squarePaymentId = null

    if (selectedPayment === 'card' && price > 0) {
      if (!cardRef.current) { setError('カード情報を入力してください。'); setSubmitting(false); return }
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK') {
        setError('カード情報の処理に失敗しました。入力内容をご確認ください。')
        setSubmitting(false); return
      }
      const chargeRes = await fetch('/api/square/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: result.token, amount: price, email: form.email }),
      })
      const chargeData = await chargeRes.json()
      if (!chargeRes.ok) {
        setError(chargeData.error || 'カード決済に失敗しました。')
        setSubmitting(false); return
      }
      squarePaymentId = chargeData.payment_id
    }

    const res = await fetch('/api/bookings/private', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...form, square_payment_id: squarePaymentId }),
    })
    setSubmitting(false)
    if (res.ok) { setDone(true) }
    else {
      const d = await res.json()
      setError(d.error === 'Out of stock' ? 'すでに申込済みです' : '送信に失敗しました。もう一度お試しください。')
    }
  }

  if (done) {
    return (
      <div style={{ background: '#e8f5e9', borderRadius: 14, padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#2e7d32', marginBottom: 8 }}>申込完了</div>
        <p style={{ fontSize: 14, color: '#555', marginBottom: 0 }}>お申し込みありがとうございます。担当よりご連絡いたします。</p>
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
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            {[['cash', '当日現金'], ['card', 'クレジットカード']].map(([v, label]) => (
              <button key={v} type="button"
                onClick={() => setForm(f => ({ ...f, payment_method: v }))}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${selectedPayment === v ? '#1a3560' : '#ddd'}`,
                  background: selectedPayment === v ? '#1a3560' : '#fff', color: selectedPayment === v ? '#fff' : '#555',
                  cursor: 'pointer', fontWeight: 600, fontSize: 14,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedPayment === 'cash' && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '12px', fontSize: 13, color: '#795548', marginBottom: 14 }}>
          💴 当日受付にてお支払いください。
        </div>
      )}

      {selectedPayment === 'card' && (
        <div style={{ marginBottom: 14 }}>
          <div id="card-container-private" style={{ minHeight: 90 }}></div>
          {!squareReady && <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>カード入力フォームを読み込み中...</p>}
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
