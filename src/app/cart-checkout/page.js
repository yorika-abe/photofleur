'use client'

import { useEffect, useState, useRef } from 'react'
import { useCart } from '@/context/CartContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || ''

async function fetchAddressByZip(zip, setForm) {
  const cleaned = zip.replace(/[^0-9]/g, '')
  if (cleaned.length !== 7) return
  try {
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`)
    const data = await res.json()
    const r = data?.results?.[0]
    if (r) setForm(f => ({ ...f, prefecture: r.address1, city: r.address2 + r.address3 }))
  } catch {}
}

export default function CartCheckoutPage() {
  const { items, ready, clearCart } = useCart()
  const router = useRouter()

  const hasSlots = items.some(i => i.type === 'slot')
  const hasDelivery = items.some(i => i.type === 'goods' && i.is_delivery)
  const goodsItems = items.filter(i => i.type === 'goods')
  const bookingItems = items.filter(i => i.type !== 'goods')

  const [form, setForm] = useState({
    last_name: '', first_name: '',
    last_name_kana: '', first_name_kana: '',
    email: '', phone: '', sns_url: '', nickname: '',
    postal_code: '', prefecture: '', city: '', street_address: '', building: '',
    marketing_consent: true,
  })
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [squareReady, setSquareReady] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [idAgreed, setIdAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const cardRef = useRef(null)
  const paymentsRef = useRef(null)

  const baseTotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)
  const discountAmount = coupon
    ? (coupon.discount_type === 'fixed' ? coupon.discount_value : Math.round(baseTotal * coupon.discount_value / 100))
    : 0
  const finalTotal = Math.max(0, baseTotal - discountAmount)

  useEffect(() => {
    if (!ready) return
    if (items.length === 0) { router.push('/'); return }
    fetch('/api/customer/profile').then(r => r.json()).then(({ profile, email }) => {
      if (!email) {
        window.location.href = `/login?redirect=${encodeURIComponent('/cart-checkout')}`
        return
      }
      setForm(f => ({
        ...f,
        last_name: profile?.last_name || f.last_name,
        first_name: profile?.first_name || f.first_name,
        last_name_kana: profile?.last_name_kana || f.last_name_kana,
        first_name_kana: profile?.first_name_kana || f.first_name_kana,
        phone: profile?.phone || f.phone,
        sns_url: profile?.sns_url || f.sns_url,
        nickname: profile?.nickname || f.nickname,
        postal_code: profile?.postal_code || f.postal_code,
        prefecture: profile?.prefecture || f.prefecture,
        city: profile?.city || f.city,
        street_address: profile?.street_address || f.street_address,
        building: profile?.building || f.building,
        email: f.email || email,
      }))
    }).catch(() => {})
  }, [ready])

  useEffect(() => {
    if (paymentMethod === 'card' && !squareReady) loadSquareSDK()
  }, [paymentMethod])

  async function loadSquareSDK() {
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
      if (!document.getElementById('card-container-cart')) return
      const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID)
      paymentsRef.current = payments
      const card = await payments.card()
      await card.attach('#card-container-cart')
      cardRef.current = card
      setSquareReady(true)
    } catch {}
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
      setCouponError(data.error || '無効なクーポンコードです')
    } else {
      setCoupon(data)
    }
    setCouponLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { last_name, first_name, last_name_kana, first_name_kana, email, phone, sns_url, nickname } = form
    if (!last_name || !first_name || !email || !phone || !sns_url || !nickname) {
      setError('必須項目を全て入力してください'); return
    }
    if (hasSlots && (!last_name_kana || !first_name_kana)) {
      setError('ふりがなを入力してください'); return
    }
    if (hasDelivery && (!form.postal_code.trim() || !form.prefecture.trim() || !form.city.trim() || !form.street_address.trim())) {
      setError('配送先住所を入力してください（郵便番号・都道府県・市区町村・番地は必須です）'); return
    }
    if (!termsAgreed) { setError('利用規約への同意が必要です'); return }
    if (!idAgreed) { setError('当日の身分証提示への同意が必要です'); return }

    setSaving(true)
    setError('')

    try {
      let squarePaymentId = null

      if (paymentMethod === 'card' && finalTotal > 0) {
        if (!cardRef.current) { setError('カード情報を入力してください'); setSaving(false); return }
        const result = await cardRef.current.tokenize()
        if (result.status !== 'OK') {
          setError('カード情報の処理に失敗しました。入力内容をご確認ください。')
          setSaving(false); return
        }
        const chargeRes = await fetch('/api/square/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: result.token, amount: finalTotal, email: form.email }),
        })
        const chargeData = await chargeRes.json()
        if (!chargeRes.ok) {
          setError(chargeData.error || 'カード決済に失敗しました')
          setSaving(false); return
        }
        squarePaymentId = chargeData.payment_id
      }

      // グッズ注文
      if (goodsItems.length > 0) {
        const deliveryAddress = hasDelivery
          ? [form.postal_code ? `〒${form.postal_code}` : '', form.prefecture, form.city, form.street_address, form.building].filter(Boolean).join(' ')
          : null

        const goodsResults = await Promise.all(goodsItems.map(item =>
          fetch('/api/orders/goods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goods_id: item.goodsId,
              last_name: form.last_name,
              first_name: form.first_name,
              email: form.email,
              phone: form.phone,
              sns_url: form.sns_url,
              payment_method: paymentMethod,
              quantity: item.quantity || 1,
              layers_path: item.layers_path || null,
              options_selected: item.options_selected || null,
              square_payment_id: squarePaymentId,
              delivery_address: item.is_delivery ? deliveryAddress : null,
            }),
          }).then(r => r.ok)
        ))

        if (!goodsResults.every(Boolean)) {
          setError('グッズの注文処理に失敗しました。もう一度お試しください。')
          setSaving(false); return
        }
      }

      // 予約・予約商品
      let qrTokens = {}
      if (bookingItems.length > 0) {
        const res = await fetch('/api/cart-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: bookingItems,
            customer: { ...form, name: `${form.last_name} ${form.first_name}` },
            paymentMethod,
            squarePaymentId,
            couponId: coupon?.id || null,
            finalTotal: bookingItems.reduce((s, i) => s + (i.price || 0), 0),
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'エラーが発生しました')
          setSaving(false); return
        }
        qrTokens = data.qrTokens || {}
      }

      // プロフィール保存
      fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_name: form.last_name, first_name: form.first_name,
          last_name_kana: form.last_name_kana, first_name_kana: form.first_name_kana,
          phone: form.phone, sns_url: form.sns_url, nickname: form.nickname,
          ...(hasDelivery ? { postal_code: form.postal_code, prefecture: form.prefecture, city: form.city, street_address: form.street_address, building: form.building } : {}),
        }),
      }).catch(() => {})

      clearCart()

      const firstSlot = bookingItems.find(i => i.type === 'slot')
      if (firstSlot && qrTokens[firstSlot.cartId]) {
        window.location.href = `/complete?slot_id=${firstSlot.slotId}&email=${encodeURIComponent(form.email)}&qr=${qrTokens[firstSlot.cartId]}`
      } else {
        window.location.href = `/complete-cart?email=${encodeURIComponent(form.email)}`
      }
    } catch (err) {
      console.error('checkout error:', err)
      setError('エラーが発生しました。もう一度お試しください。')
      setSaving(false)
    }
  }

  const inp = { width: '100%', padding: '11px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }

  if (!ready) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>
  if (items.length === 0) return null

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
      <Link href="/" style={{ color: '#1a3560', textDecoration: 'none', fontSize: 14 }}>← トップに戻る</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a3560', margin: '16px 0 24px' }}>チェックアウト</h1>

      {/* カート内容 */}
      <div style={{ background: '#f8fbff', borderRadius: 12, padding: '20px', marginBottom: 24, border: '1px solid #d6ecf5' }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>カート内容</div>
        {items.map(item => (
          <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e8f0fb' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: item.type === 'slot' ? '#1a3560' : item.type === 'goods' ? '#2e7d32' : '#5bbfd6' }}>
                {item.type === 'slot' ? '通常予約' : item.type === 'goods' ? 'グッズ' : '予約商品'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{item.name || item.title}</div>
              {item._label && <div style={{ fontSize: 12, color: '#666' }}>{item._label}</div>}
              {item.slotLabel && <div style={{ fontSize: 12, color: '#666' }}>🕐 {item.slotLabel}</div>}
              {item.eventDate && <div style={{ fontSize: 12, color: '#666' }}>📅 {item.eventDate}</div>}
              {item.eventLocation && <div style={{ fontSize: 12, color: '#666' }}>📍 {item.eventLocation}</div>}
              {item.selectionSummary && <div style={{ fontSize: 12, color: '#666' }}>{item.selectionSummary}</div>}
              {(item.quantity || 1) > 1 && <div style={{ fontSize: 12, color: '#666' }}>数量: {item.quantity}</div>}
              {item.is_delivery && <div style={{ fontSize: 12, color: '#888' }}>📦 配送あり</div>}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginLeft: 12, flexShrink: 0 }}>
              ¥{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
            </div>
          </div>
        ))}
        {coupon && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#388e3c', fontSize: 14, marginBottom: 8 }}>
            <span>クーポン割引</span>
            <span>-¥{discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #d6ecf5' }}>
          <span style={{ fontWeight: 700, color: '#555' }}>合計</span>
          <span style={{ fontWeight: 700, fontSize: 20, color: '#1a3560' }}>¥{finalTotal.toLocaleString()}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* お客様情報 */}
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
          {hasSlots && (
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
          )}
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
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>ニックネーム <span style={{ color: 'red' }}>*</span></label>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>モデルに呼ばれている名前などがある場合はそのニックネームをご記入ください</p>
            <input style={inp} value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="例：たろちゃん、yamada_photo" required />
          </div>
        </div>

        {/* 配送先住所（配送グッズがある場合のみ） */}
        {hasDelivery && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #e5e5e5', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginBottom: 18, marginTop: 0 }}>配送先住所</h2>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>郵便番号 <span style={{ color: 'red' }}>*</span></label>
              <input style={{ ...inp, maxWidth: 160 }} value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} onBlur={e => fetchAddressByZip(e.target.value, setForm)} placeholder="000-0000" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>都道府県 <span style={{ color: 'red' }}>*</span></label>
              <input style={{ ...inp, maxWidth: 180 }} value={form.prefecture} onChange={e => setForm(f => ({ ...f, prefecture: e.target.value }))} placeholder="東京都" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>市区町村 <span style={{ color: 'red' }}>*</span></label>
              <input style={inp} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="渋谷区〇〇" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>番地 <span style={{ color: 'red' }}>*</span></label>
              <input style={inp} value={form.street_address} onChange={e => setForm(f => ({ ...f, street_address: e.target.value }))} placeholder="1-2-3" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>建物名・部屋番号（任意）</label>
              <input style={inp} value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} placeholder="〇〇マンション 101号室" />
            </div>
          </div>
        )}

        {/* クーポン */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #e5e5e5', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a3560', marginBottom: 14, marginTop: 0 }}>クーポン（任意）</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inp, flex: 1 }} value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="クーポンコードを入力" disabled={!!coupon} />
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

        {/* お支払い方法 */}
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
            <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 8, padding: '12px', fontSize: 13, color: '#1565c0' }}>
              💴 当日受付にてお支払いください。予約確定メールが届いた時点で予約完了です。
            </div>
          )}
          {paymentMethod === 'card' && (
            <div>
              <div id="card-container-cart" style={{ minHeight: 90 }}></div>
              {!squareReady && <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>カード入力フォームを読み込み中...</p>}
            </div>
          )}
        </div>

        {/* 同意事項 */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#555', lineHeight: 1.6 }}>
            <input type="checkbox" checked={form.marketing_consent} onChange={e => setForm(f => ({ ...f, marketing_consent: e.target.checked }))} style={{ marginTop: 2, flexShrink: 0 }} />
            メールマガジン・お知らせの受け取りに同意する
          </label>
        </div>

        <div style={{ background: '#fce4ec', border: '1px solid #f48fb1', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: '#880e4f', margin: '0 0 10px', lineHeight: 1.7 }}>
            当日受付時に<strong>本人様確認のため顔写真付き身分証</strong>のご提示をお願いいたします。
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#555' }}>
            <input type="checkbox" checked={idAgreed} onChange={e => setIdAgreed(e.target.checked)} style={{ width: 18, height: 18, flexShrink: 0 }} />
            当日、顔写真付き身分証を提示することに同意する <span style={{ color: 'red' }}>*</span>
          </label>
        </div>

        <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: '#1565c0', margin: '0 0 10px', lineHeight: 1.7 }}>
            ご予約前に<Link href="/terms" target="_blank" style={{ color: '#1a3560', fontWeight: 700 }}>利用規約</Link>を必ずご確認ください。
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#555' }}>
            <input type="checkbox" checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)} style={{ width: 18, height: 18, flexShrink: 0 }} />
            利用規約に同意する <span style={{ color: 'red' }}>*</span>
          </label>
        </div>

        {error && (
          <div style={{ background: '#ffeef0', border: '1px solid #f5c0c5', borderRadius: 8, padding: '12px', marginBottom: 16, color: '#c0392b', fontSize: 14 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={saving}
          style={{ width: '100%', background: saving ? '#ccc' : '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '16px', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '処理中...' : `注文を確定する（¥${finalTotal.toLocaleString()}）`}
        </button>
      </form>
    </div>
  )
}
