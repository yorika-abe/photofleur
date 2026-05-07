'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || ''

function ConfirmForm() {
  const searchParams = useSearchParams()
  const slotId = searchParams.get('slot_id') || ''

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const [slotInfo, setSlotInfo] = useState(null)
  const [eventInfo, setEventInfo] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)
  const [indoorCount, setIndoorCount] = useState(0)
  const [isOutdoor, setIsOutdoor] = useState(false)
  const [finalPrice, setFinalPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    last_name: '', first_name: '',
    last_name_kana: '', first_name_kana: '',
    email: '', phone: '', sns_url: '', nickname: '',
    marketing_consent: true,
  })
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [idAgreed, setIdAgreed] = useState(false)

  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState('card')
  const [squareReady, setSquareReady] = useState(false)
  const cardRef = useRef(null)
  const paymentsRef = useRef(null)

  useEffect(() => {
    if (!slotId) { setLoading(false); return }
    loadSlotInfo()
    // ログイン確認＋プロフィール自動入力
    fetch('/api/customer/profile').then(r => r.json()).then(({ profile, email }) => {
      if (!email) {
        // 未ログインなら予約ページにリダイレクト
        window.location.href = `/login?redirect=${encodeURIComponent('/confirm?slot_id=' + slotId)}`
        return
      }
      if (profile) {
        setForm(f => ({
          ...f,
          last_name: profile.last_name || f.last_name,
          first_name: profile.first_name || f.first_name,
          last_name_kana: profile.last_name_kana || f.last_name_kana,
          first_name_kana: profile.first_name_kana || f.first_name_kana,
          phone: profile.phone || f.phone,
          sns_url: profile.sns_url || f.sns_url,
          nickname: profile.nickname || f.nickname,
        }))
      }
      if (email) setForm(f => ({ ...f, email: f.email || email }))
    }).catch(() => {})
  }, [slotId])

  useEffect(() => {
    if (!loading && paymentMethod === 'card' && !squareReady) {
      loadSquareSDK()
    }
  }, [paymentMethod, loading])

  async function loadSlotInfo() {
    const { data: slot } = await supabase
      .from('booking_slots')
      .select('id, slot_label, price, is_reserved, max_reservations, event_entry_id')
      .eq('id', slotId)
      .single()

    if (!slot) { setLoading(false); return }
    setSlotInfo(slot)

    const { data: entry } = await supabase
      .from('event_entries')
      .select('id, event_id, model_id')
      .eq('id', slot.event_entry_id)
      .single()

    if (!entry) { setLoading(false); return }

    const [{ data: event }, { data: model }, { count: bookedCount }] = await Promise.all([
      supabase.from('events').select('*').eq('id', entry.event_id).single(),
      supabase.from('models').select('id, name, image').eq('id', entry.model_id).single(),
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('slot_id', slotId).eq('is_outdoor', false),
    ])

    setEventInfo(event)
    setModelInfo(model)

    const maxIndoor = slot.max_reservations || 1
    const currentIndoor = bookedCount || 0
    setIndoorCount(currentIndoor)

    const outdoor = currentIndoor >= maxIndoor
    setIsOutdoor(outdoor)

    const basePrice = slot.price || 0
    const studioFee = (event?.studio_fee) || 0
    setFinalPrice(outdoor ? Math.max(0, basePrice - studioFee) : basePrice)

    setLoading(false)
  }

  async function loadSquareSDK() {
    if (window.Square) { await initCard(); return }
    const script = document.createElement('script')
    script.src = 'https://web.squarecdn.com/v1/square.js'
    script.onload = initCard
    document.head.appendChild(script)
  }

  async function initCard() {
    try {
      if (!SQUARE_APP_ID) { setError('クレジットカード決済は現在利用できません。当日現金をお選びください。'); return }
      // DOM要素が確実に存在するまで待機
      await new Promise(r => setTimeout(r, 300))
      if (!document.getElementById('card-container')) { setError('カード入力フォームの初期化に失敗しました。'); return }
      const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID)
      paymentsRef.current = payments
      const card = await payments.card()
      await card.attach('#card-container')
      cardRef.current = card
      setSquareReady(true)
    } catch (e) {
      setError('カード入力フォームの初期化に失敗しました。当日現金をお選びいただくか、時間をおいて再度お試しください。')
    }
  }

  async function validateCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    setCoupon(null)

    const res = await fetch('/api/coupon/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode.trim() }),
    })
    const data = await res.json()

    if (!res.ok || !data.valid) {
      setCouponError(data.error || '無効なクーポンコードです。')
    } else {
      setCoupon(data)
      const base = isOutdoor ? Math.max(0, (slotInfo?.price || 0) - (eventInfo?.studio_fee || 0)) : (slotInfo?.price || 0)
      if (data.discount_type === 'fixed') {
        setFinalPrice(Math.max(0, base - data.discount_value))
      } else {
        setFinalPrice(Math.max(0, Math.round(base * (1 - data.discount_value / 100))))
      }
    }
    setCouponLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { last_name, first_name, last_name_kana, first_name_kana, email, phone } = form
    if (!last_name || !first_name || !last_name_kana || !first_name_kana || !email || !phone || !form.sns_url || !form.nickname) {
      setError('必須項目を全て入力してください。'); return
    }
    if (!termsAgreed) {
      setError('利用規約への同意が必要です。'); return
    }
    if (!idAgreed) {
      setError('当日の身分証提示への同意が必要です。'); return
    }

    setSaving(true)
    setError('')

    let squarePaymentId = null

    if (paymentMethod === 'card') {
      if (!cardRef.current) { setError('カード情報を入力してください。'); setSaving(false); return }
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK') {
        setError('カード情報の処理に失敗しました。入力内容をご確認ください。')
        setSaving(false); return
      }

      const chargeRes = await fetch('/api/square/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: result.token, amount: finalPrice, email: form.email }),
      })
      const chargeData = await chargeRes.json()
      if (!chargeRes.ok) {
        setError(chargeData.error || 'カード決済に失敗しました。')
        setSaving(false); return
      }
      squarePaymentId = chargeData.payment_id
    }

    const bookingRes = await fetch('/api/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: slotId,
        name: `${last_name} ${first_name}`,
        last_name, first_name, last_name_kana, first_name_kana,
        email, phone,
        nickname: form.nickname || null,
        sns_url: form.sns_url || null,
        is_outdoor: isOutdoor,
        discount_amount: (slotInfo?.price || 0) - finalPrice,
        final_price: finalPrice,
        coupon_id: coupon?.id || null,
        marketing_consent: form.marketing_consent,
        payment_method: paymentMethod,
        square_payment_id: squarePaymentId,
      }),
    })

    const bookingData = await bookingRes.json()
    if (!bookingRes.ok) {
      setError(bookingData.error || '予約の保存に失敗しました。')
      setSaving(false); return
    }

    // ログイン済みならプロフィールを更新
    fetch('/api/customer/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_name: form.last_name, first_name: form.first_name, last_name_kana: form.last_name_kana, first_name_kana: form.first_name_kana, phone: form.phone, sns_url: form.sns_url, nickname: form.nickname }),
    }).catch(() => {})

    await fetch('/api/send-booking-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: slotId,
        customerName: `${last_name} ${first_name}`,
        email,
        qr_token: bookingData.qr_token,
        final_price: finalPrice,
        is_outdoor: isOutdoor,
      }),
    }).catch(() => {})

    window.location.href = `/complete?booking_id=${bookingData.id}&qr=${bookingData.qr_token}`
  }

  function formatDate(d) {
    if (!d) return ''
    const date = new Date(d + 'T00:00:00')
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`
  }

  const inp = { width: '100%', padding: '11px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>
  if (!slotInfo) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>予約枠が見つかりません。</div>

  const fullIndoor = indoorCount >= (slotInfo.max_reservations || 1)

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
      <Link href="/schedule" style={{ color: '#1a3560', textDecoration: 'none', fontSize: 14 }}>← スケジュールに戻る</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', margin: '16px 0 24px' }}>予約情報入力</h1>

      {/* Booking summary */}
      <div style={{ background: '#f8fbff', borderRadius: 12, padding: '20px', marginBottom: 24, border: '1px solid #d6ecf5' }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>予約内容</div>
        {modelInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {modelInfo.image && <img src={modelInfo.image} alt={modelInfo.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />}
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1a3560' }}>{modelInfo.name}</span>
          </div>
        )}
        {eventInfo && (
          <div style={{ fontSize: 14, color: '#555', lineHeight: 2 }}>
            <div>📅 {formatDate(eventInfo.event_date)}</div>
            <div>🕐 {slotInfo.slot_label}</div>
            <div>📍 {eventInfo.location_name}</div>
          </div>
        )}
        {isOutdoor && (
          <div style={{ background: '#fff3e0', border: '1px solid #ffe082', borderRadius: 8, padding: '10px 12px', marginTop: 12, fontSize: 13, color: '#e65100' }}>
            スタジオが満員のため<strong>屋外撮影</strong>となります（スタジオ料金割引適用）
          </div>
        )}
        <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3560', marginTop: 12 }}>
          ¥{finalPrice.toLocaleString()}
          {coupon && <span style={{ fontSize: 12, color: '#388e3c', marginLeft: 8 }}>クーポン適用済み</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Customer info */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #e5e5e5', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginBottom: 18, marginTop: 0 }}>お客様情報</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>姓 <span style={{ color: 'red' }}>*</span></label>
              <input style={inp} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="山田" required />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>名 <span style={{ color: 'red' }}>*</span></label>
              <input style={inp} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="太郎" required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>姓（ふりがな） <span style={{ color: 'red' }}>*</span></label>
              <input style={inp} value={form.last_name_kana} onChange={e => setForm(f => ({ ...f, last_name_kana: e.target.value }))} placeholder="やまだ" required />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>名（ふりがな） <span style={{ color: 'red' }}>*</span></label>
              <input style={inp} value={form.first_name_kana} onChange={e => setForm(f => ({ ...f, first_name_kana: e.target.value }))} placeholder="たろう" required />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>メールアドレス <span style={{ color: 'red' }}>*</span></label>
            <input type="email" style={inp} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="example@email.com" required />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>電話番号 <span style={{ color: 'red' }}>*</span></label>
            <input type="tel" style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="09012345678" required />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>SNS URL <span style={{ color: 'red' }}>*</span></label>
            <input style={inp} value={form.sns_url} onChange={e => setForm(f => ({ ...f, sns_url: e.target.value }))} placeholder="https://twitter.com/..." required />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>ニックネーム（アカウント名など） <span style={{ color: 'red' }}>*</span></label>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>モデルに呼ばれている名前などがある場合はそのニックネームをご記入ください</p>
            <input style={inp} value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="例：たろちゃん、yamada_photo" required />
          </div>
        </div>

        {/* Coupon */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #e5e5e5', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginBottom: 14, marginTop: 0 }}>クーポン（任意）</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inp, flex: 1 }} value={couponCode} onChange={e => setCouponCode(e.target.value)}
              placeholder="クーポンコードを入力" disabled={!!coupon} />
            <button type="button" onClick={validateCoupon} disabled={couponLoading || !!coupon}
              style={{ padding: '11px 16px', background: coupon ? '#e8f5e9' : '#1a3560', color: coupon ? '#388e3c' : '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
              {coupon ? '適用済み' : couponLoading ? '確認中' : '適用'}
            </button>
          </div>
          {couponError && <p style={{ color: '#c62828', fontSize: 13, marginTop: 6, marginBottom: 0 }}>{couponError}</p>}
          {coupon && (
            <p style={{ color: '#388e3c', fontSize: 13, marginTop: 6, marginBottom: 0 }}>
              {coupon.discount_type === 'fixed' ? `¥${coupon.discount_value.toLocaleString()}割引` : `${coupon.discount_value}%割引`}が適用されました
            </p>
          )}
        </div>

        {/* Payment method */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #e5e5e5', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginBottom: 14, marginTop: 0 }}>お支払い方法</h2>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[['cash', '当日現金'], ['card', 'クレジットカード']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setPaymentMethod(val)}
                style={{ flex: 1, padding: '12px', borderRadius: 8, border: `2px solid ${paymentMethod === val ? '#1a3560' : '#ddd'}`, background: paymentMethod === val ? '#1a3560' : '#fff', color: paymentMethod === val ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                {label}
              </button>
            ))}
          </div>

          {paymentMethod === 'cash' && (
            <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '12px', fontSize: 13, color: '#795548' }}>
              💴 当日受付にてお支払いください。予約確定メールが届いた時点で予約完了です。
            </div>
          )}

          {paymentMethod === 'card' && (
            <div>
              <div id="card-container" style={{ minHeight: 90 }}></div>
              {!squareReady && <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>カード入力フォームを読み込み中...</p>}
            </div>
          )}
        </div>

        {/* Marketing consent */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#555', lineHeight: 1.6 }}>
            <input type="checkbox" checked={form.marketing_consent} onChange={e => setForm(f => ({ ...f, marketing_consent: e.target.checked }))}
              style={{ marginTop: 2, flexShrink: 0 }} />
            メールマガジン・お知らせの受け取りに同意する
          </label>
        </div>

        {/* ID verification agreement (required) */}
        <div style={{ background: '#fce4ec', border: '1px solid #f48fb1', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: '#880e4f', margin: '0 0 10px', lineHeight: 1.7 }}>
            当日受付時に<strong>本人様確認のため顔写真付き身分証</strong>のご提示をお願いいたします。
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#555' }}>
            <input type="checkbox" checked={idAgreed} onChange={e => setIdAgreed(e.target.checked)}
              style={{ width: 18, height: 18, flexShrink: 0 }} />
            当日、顔写真付き身分証を提示することに同意する <span style={{ color: 'red' }}>*</span>
          </label>
        </div>

        {/* Terms agreement (required) */}
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: '#795548', margin: '0 0 10px', lineHeight: 1.7 }}>
            ご予約前に<Link href="/terms" target="_blank" style={{ color: '#1a3560', fontWeight: 700 }}>利用規約</Link>を必ずご確認ください。予約することで利用規約に同意したこととします。
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#555' }}>
            <input type="checkbox" checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)}
              style={{ width: 18, height: 18, flexShrink: 0 }} />
            利用規約に同意する <span style={{ color: 'red' }}>*</span>
          </label>
        </div>

        {error && (
          <div style={{ background: '#ffeef0', border: '1px solid #f5c0c5', borderRadius: 8, padding: '12px', marginBottom: 16, color: '#c0392b', fontSize: 14 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={saving || (fullIndoor && !isOutdoor)}
          style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '16px', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? '処理中...' : `予約を確定する（¥${finalPrice.toLocaleString()}）`}
        </button>
      </form>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>}>
      <ConfirmForm />
    </Suspense>
  )
}
