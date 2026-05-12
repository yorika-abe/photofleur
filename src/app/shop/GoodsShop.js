'use client'
import { useState, useEffect, useRef } from 'react'
import LayerOptionPicker from '@/components/LayerOptionPicker'
import { buildSelectionsLabel, getLeafChoicePrice } from '@/lib/product-layers'

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || ''

async function fetchAddressByZip(zip, setForm) {
  const cleaned = zip.replace(/[^0-9]/g, '')
  if (cleaned.length !== 7) return
  try {
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`)
    const data = await res.json()
    const r = data?.results?.[0]
    if (r) {
      setForm(f => ({ ...f, prefecture: r.address1, city: r.address2 + r.address3 }))
    }
  } catch {}
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem('pf_cart') || '[]') } catch { return [] }
}
function saveCart(items) {
  try { localStorage.setItem('pf_cart', JSON.stringify(items)) } catch {}
}
function cid() { return Math.random().toString(36).slice(2, 9) }

export default function GoodsShop() {
  const [goods, setGoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [orderTarget, setOrderTarget] = useState(null)
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginRedirect, setLoginRedirect] = useState('/')

  useEffect(() => {
    setCart(loadCart())
    fetch('/api/goods').then(r => r.json()).then(d => {
      setGoods(d.goods || [])
      setLoading(false)
    })
    fetch('/api/customer/profile').then(r => r.json()).then(({ email }) => {
      setIsLoggedIn(!!email)
    }).catch(() => setIsLoggedIn(false))
  }, [])

  function requireLogin(action, redirectUrl) {
    if (isLoggedIn === true) { action(); return }
    setLoginRedirect(redirectUrl || '/shop')
    setShowLoginPrompt(true)
  }

  function openOrder(g) {
    setOrderTarget(g)
  }

  function updateCart(newCart) {
    setCart(newCart)
    saveCart(newCart)
  }

  function addToCart(item) { updateCart([...cart, { ...item, _cartId: cid() }]) }
  function removeFromCart(_cartId) { updateCart(cart.filter(i => i._cartId !== _cartId)) }

  const cartCount = cart.reduce((s, i) => s + (i.quantity || 1), 0)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', padding: '0 20px 32px' }}>
        <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 11, letterSpacing: '0.3em', color: '#999', textTransform: 'uppercase', marginBottom: 8, fontStyle: 'italic' }}>Our</p>
        <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 'clamp(52px, 10vw, 96px)', fontWeight: 400, color: '#0d1f3a', letterSpacing: '0.18em', margin: 0, lineHeight: 1 }}>SHOP</h1>
        <div style={{ width: '100%', maxWidth: 600, height: 1, background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.15), transparent)', margin: '20px auto 0' }} />
      </div>

      {loading ? (
        <p style={{ color: '#aaa' }}>読み込み中...</p>
      ) : goods.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛍️</div>
          <p>現在販売中のグッズはありません。</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {goods.map(g => {
            const soldOut = g.stock === 0
            return (
              <div key={g.id}
                onClick={() => !soldOut && openOrder(g)}
                style={{ background: '#fff', borderRadius: 16, border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', opacity: soldOut ? 0.75 : 1, cursor: soldOut ? 'default' : 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { if (!soldOut) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,53,96,0.15)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}>
                {g.image ? (
                  <img src={g.image} alt={g.title} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '4/3', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🛍️</div>
                )}
                <div style={{ padding: '16px 18px 20px' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1a3560', marginBottom: 6 }}>{g.title}</div>
                  {g.description && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, marginBottom: 12 }}>{g.description}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                    <div>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#1a3560' }}>¥{g.price.toLocaleString()}</span>
                      {g.stock >= 0 && g.stock <= 5 && !soldOut && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#c62828' }}>残{g.stock}個</span>
                      )}
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>※対象によって料金が変動します</div>
                    </div>
                    {soldOut && <span style={{ fontSize: 13, color: '#e53935', fontWeight: 700 }}>完売御礼</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showLoginPrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3560', marginBottom: 8 }}>ログインが必要です</div>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>グッズを購入するにはログインしてください。</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href={`/login?redirect=${encodeURIComponent(loginRedirect)}`} style={{ display: 'block', padding: '12px', borderRadius: 10, background: '#1a3560', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>ログインする</a>
              <button onClick={() => setShowLoginPrompt(false)} style={{ padding: '10px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {orderTarget && (
        <OrderModal
          goods={orderTarget}
          onClose={() => setOrderTarget(null)}
          onComplete={() => setOrderTarget(null)}
          onAddToCart={(item) => { addToCart(item); requireLogin(() => { setOrderTarget(null) }, '/cart-checkout') }}
          onLoginRequired={() => { setOrderTarget(null); setLoginRedirect('/shop'); setShowLoginPrompt(true) }}
          isLoggedIn={isLoggedIn}
        />
      )}

      {cartCount > 0 && (
        <button onClick={() => isLoggedIn === true ? setShowCart(true) : isLoggedIn === false ? setShowLoginPrompt(true) : null}
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900, background: '#1a3560', color: '#fff', border: 'none', borderRadius: 24, padding: '12px 22px', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,53,96,0.35)' }}>
          🛒 カート ({cartCount})
        </button>
      )}

      {showCart && (
        <CartDrawer
          cart={cart}
          onClose={() => setShowCart(false)}
          onRemove={removeFromCart}
          onOrderComplete={() => { updateCart([]); setShowCart(false) }}
        />
      )}
    </div>
  )
}

// ---- OrderModal ----
function OrderModal({ goods, onClose, onComplete, onAddToCart, onLoginRequired, isLoggedIn }) {
  const isDelivery = !!goods.options?.is_delivery
  const isLayers = goods.options?.type === 'layers'
  const optionGroups = !isLayers && goods.options?.type === 'groups' ? goods.options.groups : []
  const layers = isLayers ? (goods.options?.layers || []) : []

  const [form, setForm] = useState({
    last_name: '', first_name: '', email: '', phone: '', sns_url: '',
    payment_method: goods.payment_method === 'both' ? 'card' : goods.payment_method,
    quantity: 1, notes: '', postal_code: '', prefecture: '', city: '', street_address: '', building: '',
  })
  const [layerPath, setLayerPath] = useState([])
  const [optionsSelected, setOptionsSelected] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [squareReady, setSquareReady] = useState(false)
  const cardRef = useRef(null)
  const paymentsRef = useRef(null)

  const selectedPayment = form.payment_method

  useEffect(() => {
    fetch('/api/customer/profile').then(r => r.json()).then(({ profile, email }) => {
      if (!profile && !email) return
      setForm(f => ({
        ...f,
        last_name: profile?.last_name || f.last_name,
        first_name: profile?.first_name || f.first_name,
        email: email || f.email,
        phone: profile?.phone || f.phone,
        sns_url: profile?.sns_url || f.sns_url,
        postal_code: profile?.postal_code || f.postal_code,
        prefecture: profile?.prefecture || f.prefecture,
        city: profile?.city || f.city,
        street_address: profile?.street_address || f.street_address,
        building: profile?.building || f.building,
      }))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedPayment === 'card') loadSquareSDK()
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
      if (!document.getElementById('card-container-shop')) return
      const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID)
      paymentsRef.current = payments
      const card = await payments.card()
      await card.attach('#card-container-shop')
      cardRef.current = card
      setSquareReady(true)
    } catch {
      setError('カード入力フォームの初期化に失敗しました。当日現金をお選びください。')
    }
  }

  // Check if all selections are complete
  const isLayersComplete = !isLayers || layers.length === 0 || layerPath.length >= layers.length
  const isGroupsComplete = isLayers || optionGroups.every(g => {
    const sel = optionsSelected[g.name]
    if (!sel) return false
    if (g.type === 'models' && g.model_choices) {
      const mc = g.model_choices.find(mc => mc.model_id === sel.model_id)
      if (mc?.choices?.length > 0 && !sel.choice) return false
    }
    return true
  })
  const isSelectionsComplete = isLayersComplete && isGroupsComplete
  const hasOptions = isLayers ? layers.length > 0 : optionGroups.length > 0

  const choicePrice = isLayers && layerPath.length === layers.length && layerPath.length > 0
    ? getLeafChoicePrice(goods.options, layerPath)
    : null
  const unitPrice = choicePrice ?? goods.price
  const totalPrice = unitPrice * form.quantity
  const maxQty = goods.stock >= 0 ? goods.stock : 99

  function buildCartItem() {
    const label = isLayers && layerPath.length > 0
      ? buildSelectionsLabel(goods.options, layerPath)
      : optionGroups.map(g => {
          const sel = optionsSelected[g.name]
          if (!sel) return null
          if (g.type === 'models') return `${sel.model_name}${sel.choice ? ' / ' + sel.choice : ''}`
          return Array.isArray(sel) ? sel.join('/') : sel
        }).filter(Boolean).join(' / ')
    return {
      goods_id: goods.id,
      title: goods.title,
      price: unitPrice,
      image: goods.image,
      quantity: form.quantity,
      layers_path: isLayers && layerPath.length > 0 ? layerPath : null,
      options_selected: !isLayers && Object.keys(optionsSelected).length > 0 ? optionsSelected : null,
      _label: label || null,
      is_delivery: isDelivery,
      payment_method: goods.payment_method,
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (isLoggedIn !== true) { onLoginRequired?.(); return }
    if (!form.last_name || !form.email) { setError('氏名・メールアドレスは必須です'); return }
    if (hasOptions && !isSelectionsComplete) { setError('全ての選択肢を選んでください'); return }
    if (isDelivery && (!form.postal_code.trim() || !form.prefecture.trim() || !form.city.trim() || !form.street_address.trim())) { setError('お届け先住所を入力してください（郵便番号・都道府県・市区町村・番地は必須です）'); return }
    setSubmitting(true); setError('')

    let squarePaymentId = null
    if (selectedPayment === 'card' && totalPrice > 0) {
      if (!cardRef.current) { setError('カード情報を入力してください。'); setSubmitting(false); return }
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK') { setError('カード情報の処理に失敗しました。'); setSubmitting(false); return }
      const chargeRes = await fetch('/api/square/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: result.token, amount: totalPrice, email: form.email }),
      })
      const chargeData = await chargeRes.json()
      if (!chargeRes.ok) { setError(chargeData.error || 'カード決済に失敗しました。'); setSubmitting(false); return }
      squarePaymentId = chargeData.payment_id
    }

    const res = await fetch('/api/orders/goods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goods_id: goods.id, ...form,
        square_payment_id: squarePaymentId,
        options_selected: Object.keys(optionsSelected).length > 0 ? optionsSelected : null,
        layers_path: isLayers && layerPath.length > 0 ? layerPath : null,
        delivery_address: isDelivery ? [form.postal_code ? `〒${form.postal_code}` : '', form.prefecture, form.city, form.street_address, form.building].filter(Boolean).join(' ') : null,
        sns_url: form.sns_url || null,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      setDone(true)
      if (form.email) {
        fetch('/api/customer/profile', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_name: form.last_name, first_name: form.first_name, phone: form.phone, email: form.email, sns_url: form.sns_url, postal_code: form.postal_code, prefecture: form.prefecture, city: form.city, street_address: form.street_address, building: form.building }),
        }).catch(() => {})
      }
    } else {
      const d = await res.json()
      setError(d.error === 'Out of stock' ? '申し訳ありませんが売り切れました' : '送信に失敗しました。もう一度お試しください。')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3560' }}>{goods.title}</div>
            <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>¥{unitPrice.toLocaleString()} / 個{choicePrice != null && choicePrice !== goods.price && <span style={{ fontSize: 11, color: '#aaa', marginLeft: 4 }}>（選択肢価格）</span>}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
        </div>

        {done ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#2e7d32', marginBottom: 8 }}>ご購入ありがとうございます</div>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>完了メールを送信いたしますのでご確認ください。</p>
            <button onClick={onComplete} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#1a3560', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>閉じる</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: '20px 24px 24px' }}>

            {/* === 選択肢（最初に表示） === */}
            {isLayers && (
              <div style={{ marginBottom: 18 }}>
                <LayerOptionPicker
                  options={goods.options}
                  value={layerPath}
                  onChange={setLayerPath}
                />
                {hasOptions && !isLayersComplete && (
                  <p style={{ fontSize: 12, color: '#c62828', marginTop: 6 }}>⚠ 全ての選択肢を選んでください</p>
                )}
              </div>
            )}

            {!isLayers && optionGroups.map((group, i) => {
              if (group.type === 'models' && group.model_choices) {
                const sel = optionsSelected[group.name]
                const selectedModelData = sel ? group.model_choices.find(mc => mc.model_id === sel.model_id) : null
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <label style={lbl}>{group.name} *</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {group.model_choices.map(mc => {
                        const modelSoldOut = mc.choices.length === 0 && mc.stock === 0
                        const isSelected = sel?.model_id === mc.model_id
                        return (
                          <button key={mc.model_id} type="button" disabled={modelSoldOut}
                            onClick={() => { if (!modelSoldOut) setOptionsSelected(prev => ({ ...prev, [group.name]: { model_id: mc.model_id, model_name: mc.model_name, choice: null } })) }}
                            style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${isSelected ? '#1a3560' : modelSoldOut ? '#eee' : '#ddd'}`, background: isSelected ? '#1a3560' : modelSoldOut ? '#f5f5f5' : '#fff', color: isSelected ? '#fff' : modelSoldOut ? '#bbb' : '#555', cursor: modelSoldOut ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
                            {mc.model_name}{modelSoldOut ? ' (満員)' : ''}
                          </button>
                        )
                      })}
                    </div>
                    {selectedModelData && selectedModelData.choices.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <label style={{ ...lbl, marginBottom: 6 }}>内容を選択 *</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {selectedModelData.choices.map(c => {
                            const soldOut = c.stock === 0
                            const isChoiceSelected = sel?.choice === c.name
                            return (
                              <button key={c.name} type="button" disabled={soldOut}
                                onClick={() => { if (!soldOut) setOptionsSelected(prev => ({ ...prev, [group.name]: { ...prev[group.name], choice: c.name } })) }}
                                style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${isChoiceSelected ? '#1a3560' : soldOut ? '#eee' : '#ddd'}`, background: isChoiceSelected ? '#1a3560' : soldOut ? '#f5f5f5' : '#fff', color: isChoiceSelected ? '#fff' : soldOut ? '#bbb' : '#555', cursor: soldOut ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
                                {c.name}{soldOut ? ' (売切)' : c.stock > 0 && c.stock <= 5 ? ` 残${c.stock}` : ''}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <label style={lbl}>{group.name} *</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {(group.choices || []).map(rawChoice => {
                      const choice = typeof rawChoice === 'string' ? { name: rawChoice, stock: -1 } : rawChoice
                      const soldOut = choice.stock === 0
                      const selected = group.multiple
                        ? (optionsSelected[group.name] || []).includes(choice.name)
                        : optionsSelected[group.name] === choice.name
                      return (
                        <button key={choice.name} type="button" disabled={soldOut}
                          onClick={() => {
                            if (soldOut) return
                            if (group.multiple) {
                              const current = optionsSelected[group.name] || []
                              setOptionsSelected(prev => ({ ...prev, [group.name]: selected ? current.filter(c => c !== choice.name) : [...current, choice.name] }))
                            } else {
                              setOptionsSelected(prev => ({ ...prev, [group.name]: choice.name }))
                            }
                          }}
                          style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${selected ? '#1a3560' : soldOut ? '#eee' : '#ddd'}`, background: selected ? '#1a3560' : soldOut ? '#f5f5f5' : '#fff', color: selected ? '#fff' : soldOut ? '#bbb' : '#555', cursor: soldOut ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
                          {choice.name}{soldOut ? ' (売切)' : choice.stock > 0 && choice.stock <= 5 ? ` 残${choice.stock}` : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* 選択肢と購入者情報の区切り */}
            {hasOptions && (
              <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0 18px' }} />
            )}

            {/* === 購入者情報 === */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>姓 *</label>
                <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="山田" required style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>名</label>
                <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="太郎" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>メールアドレス *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="example@email.com" required style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>電話番号（任意）</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="090-0000-0000" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>SNS URL（任意）</label>
              <input type="url" value={form.sns_url} onChange={e => setForm(f => ({ ...f, sns_url: e.target.value }))} placeholder="https://instagram.com/..." style={inp} />
            </div>
            {isDelivery && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>郵便番号 *</label>
                  <input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} onBlur={e => fetchAddressByZip(e.target.value, setForm)} placeholder="000-0000" style={{ ...inp, maxWidth: 140 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>都道府県 *</label>
                  <input value={form.prefecture} onChange={e => setForm(f => ({ ...f, prefecture: e.target.value }))} placeholder="東京都" style={{ ...inp, maxWidth: 160 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>市区町村 *</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="渋谷区〇〇" style={inp} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>番地 *</label>
                  <input value={form.street_address} onChange={e => setForm(f => ({ ...f, street_address: e.target.value }))} placeholder="1-2-3" style={inp} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>建物名・部屋番号（任意）</label>
                  <input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} placeholder="〇〇マンション 101号室" style={inp} />
                </div>
              </>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>数量</label>
              <input type="number" min="1" max={maxQty} value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: Math.max(1, Math.min(maxQty, Number(e.target.value))) }))}
                style={{ ...inp, width: 100 }} />
            </div>

            {goods.payment_method === 'both' && (
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>お支払方法 *</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  {[['card', 'クレジットカード'], ['cash', '当日現金']].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, payment_method: v }))}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${selectedPayment === v ? '#1a3560' : '#ddd'}`, background: selectedPayment === v ? '#1a3560' : '#fff', color: selectedPayment === v ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedPayment === 'cash' && (
              <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 8, padding: 12, fontSize: 13, color: '#1565c0', marginBottom: 14 }}>
                💴 受け取り時にお支払いください。
              </div>
            )}
            {selectedPayment === 'card' && (
              <div style={{ marginBottom: 14 }}>
                <div id="card-container-shop" style={{ minHeight: 90 }}></div>
                {!squareReady && <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>カード入力フォームを読み込み中...</p>}
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>備考・ご要望（任意）</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="ご質問・ご要望などあればご記入ください" style={{ ...inp, resize: 'vertical' }} />
            </div>

            <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#555' }}>合計</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#1a3560' }}>¥{totalPrice.toLocaleString()}</span>
            </div>

            {error && (
              <div style={{ background: '#ffebee', color: '#c62828', borderRadius: 8, padding: '10px 14px', fontSize: 14, marginBottom: 14 }}>{error}</div>
            )}
            {hasOptions && !isSelectionsComplete && (
              <div style={{ background: '#ffebee', color: '#c62828', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
                ⚠ 上の選択肢を全て選んでから注文できます
              </div>
            )}

            <button type="submit" disabled={submitting || (hasOptions && !isSelectionsComplete)}
              style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: (submitting || (hasOptions && !isSelectionsComplete)) ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 16, cursor: (submitting || (hasOptions && !isSelectionsComplete)) ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
              {submitting ? '送信中...' : selectedPayment === 'card' ? '決済して注文する' : '注文する'}
            </button>

            <button type="button"
              disabled={hasOptions && !isSelectionsComplete}
              onClick={() => { if (hasOptions && !isSelectionsComplete) return; if (isLoggedIn !== true) { onLoginRequired?.(); return } onAddToCart(buildCartItem()) }}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: `2px solid ${(hasOptions && !isSelectionsComplete) ? '#ddd' : '#1a3560'}`, background: '#fff', color: (hasOptions && !isSelectionsComplete) ? '#bbb' : '#1a3560', fontWeight: 700, fontSize: 15, cursor: (hasOptions && !isSelectionsComplete) ? 'not-allowed' : 'pointer' }}>
              🛒 カートに入れる
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ---- CartDrawer ----
function CartDrawer({ cart, onClose, onRemove, onOrderComplete }) {
  const [checkingOut, setCheckingOut] = useState(false)
  const total = cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0)

  if (checkingOut) {
    return (
      <CartCheckout
        cart={cart}
        onClose={onClose}
        onCancel={() => setCheckingOut(false)}
        onOrderComplete={onOrderComplete}
      />
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3560' }}>🛒 カート</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>

        <div style={{ padding: '16px 24px' }}>
          {cart.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: '24px 0' }}>カートは空です</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {cart.map(item => (
                  <div key={item._cartId} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#f8f9ff', borderRadius: 10, padding: '10px 12px' }}>
                    {item.image && <img src={item.image} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560' }}>{item.title}</div>
                      {item._label && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{item._label}</div>}
                      <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>¥{item.price.toLocaleString()} × {item.quantity || 1} = <strong style={{ color: '#1a3560' }}>¥{(item.price * (item.quantity || 1)).toLocaleString()}</strong></div>
                    </div>
                    <button onClick={() => onRemove(item._cartId)} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 18, cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>

              <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>合計</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#1a3560' }}>¥{total.toLocaleString()}</span>
              </div>

              <button onClick={() => setCheckingOut(true)}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#1a3560', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                まとめて注文する
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- CartCheckout ----
function CartCheckout({ cart, onClose, onCancel, onOrderComplete }) {
  const hasDelivery = cart.some(i => i.is_delivery)
  const paymentOptions = (() => {
    const methods = cart.map(i => i.payment_method)
    if (methods.every(m => m === 'cash')) return 'cash'
    if (methods.every(m => m === 'card')) return 'card'
    return 'both'
  })()

  const [form, setForm] = useState({
    last_name: '', first_name: '', email: '', phone: '', sns_url: '',
    payment_method: paymentOptions === 'both' ? 'card' : paymentOptions,
    notes: '', postal_code: '', prefecture: '', city: '', street_address: '', building: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [squareReady, setSquareReady] = useState(false)
  const cardRef = useRef(null)

  const selectedPayment = form.payment_method
  const total = cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0)

  useEffect(() => {
    fetch('/api/customer/profile').then(r => r.json()).then(({ profile, email }) => {
      if (!profile && !email) return
      setForm(f => ({
        ...f,
        last_name: profile?.last_name || f.last_name,
        first_name: profile?.first_name || f.first_name,
        email: email || f.email,
        phone: profile?.phone || f.phone,
        sns_url: profile?.sns_url || f.sns_url,
      }))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedPayment === 'card') loadSquare()
  }, [selectedPayment])

  async function loadSquare() {
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
      if (!document.getElementById('card-container-cart')) return
      const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID)
      const card = await payments.card()
      await card.attach('#card-container-cart')
      cardRef.current = card
      setSquareReady(true)
    } catch { setError('カード入力フォームの初期化に失敗しました。') }
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.last_name || !form.email) { setError('氏名・メールアドレスは必須です'); return }
    if (hasDelivery && (!form.postal_code.trim() || !form.prefecture.trim() || !form.city.trim() || !form.street_address.trim())) { setError('お届け先住所を入力してください（郵便番号・都道府県・市区町村・番地は必須です）'); return }
    setSubmitting(true); setError('')

    let squarePaymentId = null
    if (selectedPayment === 'card' && total > 0) {
      if (!cardRef.current) { setError('カード情報を入力してください。'); setSubmitting(false); return }
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK') { setError('カード情報の処理に失敗しました。'); setSubmitting(false); return }
      const chargeRes = await fetch('/api/square/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: result.token, amount: total, email: form.email }),
      })
      const chargeData = await chargeRes.json()
      if (!chargeRes.ok) { setError(chargeData.error || 'カード決済に失敗しました。'); setSubmitting(false); return }
      squarePaymentId = chargeData.payment_id
    }

    const results = await Promise.all(cart.map(item =>
      fetch('/api/orders/goods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goods_id: item.goods_id,
          last_name: form.last_name, first_name: form.first_name,
          email: form.email, phone: form.phone, sns_url: form.sns_url || null,
          payment_method: form.payment_method,
          quantity: item.quantity || 1,
          notes: form.notes || null,
          square_payment_id: squarePaymentId,
          options_selected: item.options_selected || null,
          layers_path: item.layers_path || null,
          delivery_address: item.is_delivery ? [form.postal_code ? `〒${form.postal_code}` : '', form.prefecture, form.city, form.street_address, form.building].filter(Boolean).join(' ') : null,
        }),
      }).then(r => r.ok)
    ))

    setSubmitting(false)
    if (results.every(Boolean)) {
      setDone(true)
      if (form.email) {
        fetch('/api/customer/profile', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_name: form.last_name, first_name: form.first_name, phone: form.phone, email: form.email, sns_url: form.sns_url }),
        }).catch(() => {})
      }
    } else {
      setError('一部の注文に失敗しました。もう一度お試しください。')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3560' }}>ご注文情報の入力</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>

        {done ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#2e7d32', marginBottom: 8 }}>ご購入ありがとうございます</div>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>完了メールを送信いたしますのでご確認ください。</p>
            <button onClick={onOrderComplete} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#1a3560', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>閉じる</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: '20px 24px 24px' }}>
            <div style={{ background: '#f8f9ff', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 6 }}>注文内容 ({cart.length}件)</div>
              {cart.map(item => (
                <div key={item._cartId} style={{ fontSize: 13, color: '#444', marginBottom: 3 }}>
                  {item.title}{item._label ? ` / ${item._label}` : ''} × {item.quantity || 1} — ¥{(item.price * (item.quantity || 1)).toLocaleString()}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>姓 *</label>
                <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="山田" required style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>名</label>
                <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="太郎" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>メールアドレス *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="example@email.com" required style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>電話番号（任意）</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="090-0000-0000" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>SNS URL（任意）</label>
              <input type="url" value={form.sns_url} onChange={e => setForm(f => ({ ...f, sns_url: e.target.value }))} placeholder="https://instagram.com/..." style={inp} />
            </div>
            {hasDelivery && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>郵便番号 *</label>
                  <input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} onBlur={e => fetchAddressByZip(e.target.value, setForm)} placeholder="000-0000" style={{ ...inp, maxWidth: 140 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>都道府県 *</label>
                  <input value={form.prefecture} onChange={e => setForm(f => ({ ...f, prefecture: e.target.value }))} placeholder="東京都" style={{ ...inp, maxWidth: 160 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>市区町村 *</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="渋谷区〇〇" style={inp} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>番地 *</label>
                  <input value={form.street_address} onChange={e => setForm(f => ({ ...f, street_address: e.target.value }))} placeholder="1-2-3" style={inp} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>建物名・部屋番号（任意）</label>
                  <input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} placeholder="〇〇マンション 101号室" style={inp} />
                </div>
              </>
            )}

            {paymentOptions === 'both' && (
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>お支払方法 *</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  {[['card', 'クレジットカード'], ['cash', '当日現金']].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, payment_method: v }))}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${selectedPayment === v ? '#1a3560' : '#ddd'}`, background: selectedPayment === v ? '#1a3560' : '#fff', color: selectedPayment === v ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedPayment === 'cash' && (
              <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 8, padding: 12, fontSize: 13, color: '#1565c0', marginBottom: 14 }}>
                💴 受け取り時にお支払いください。
              </div>
            )}
            {selectedPayment === 'card' && (
              <div style={{ marginBottom: 14 }}>
                <div id="card-container-cart" style={{ minHeight: 90 }}></div>
                {!squareReady && <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>カード入力フォームを読み込み中...</p>}
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>備考・ご要望（任意）</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="ご質問・ご要望などあればご記入ください" style={{ ...inp, resize: 'vertical' }} />
            </div>

            <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#555' }}>合計</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#1a3560' }}>¥{total.toLocaleString()}</span>
            </div>

            {error && (
              <div style={{ background: '#ffebee', color: '#c62828', borderRadius: 8, padding: '10px 14px', fontSize: 14, marginBottom: 14 }}>{error}</div>
            )}

            <button type="submit" disabled={submitting}
              style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: submitting ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 16, cursor: submitting ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
              {submitting ? '送信中...' : selectedPayment === 'card' ? '決済してまとめて注文する' : 'まとめて注文する'}
            </button>
            <button type="button" onClick={onCancel}
              style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              ← カートに戻る
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }
const inp = { width: '100%', padding: '9px 11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
