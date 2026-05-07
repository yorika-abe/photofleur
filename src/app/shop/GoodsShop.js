'use client'
import { useState, useEffect, useRef } from 'react'
import LayerOptionPicker from '@/components/LayerOptionPicker'

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || ''

export default function GoodsShop() {
  const [goods, setGoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [orderTarget, setOrderTarget] = useState(null) // goods item being ordered

  useEffect(() => {
    fetch('/api/goods').then(r => r.json()).then(d => {
      setGoods(d.goods || [])
      setLoading(false)
    })
  }, [])

  function onOrderComplete(goodsId) {
    setOrderTarget(null)
    setGoods(prev => prev.map(g =>
      g.id === goodsId && g.stock >= 0 ? { ...g, stock: g.stock - 1 } : g
    ))
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a3560', marginBottom: 8 }}>グッズショップ</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>PhotoFleurオリジナルグッズを販売しています。</p>

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
              <div key={g.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', opacity: soldOut ? 0.75 : 1 }}>
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
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#e65100' }}>残{g.stock}個</span>
                      )}
                    </div>
                    {soldOut ? (
                      <span style={{ fontSize: 13, color: '#e53935', fontWeight: 700 }}>完売御礼</span>
                    ) : (
                      <button
                        onClick={() => setOrderTarget(g)}
                        style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#1a3560', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        購入する
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {orderTarget && (
        <OrderModal
          goods={orderTarget}
          onClose={() => setOrderTarget(null)}
          onComplete={() => onOrderComplete(orderTarget.id)}
        />
      )}
    </div>
  )
}

function OrderModal({ goods, onClose, onComplete }) {
  const isDelivery = !!goods.options?.is_delivery
  const isLayers = goods.options?.type === 'layers'
  const [form, setForm] = useState({
    last_name: '', first_name: '', email: '', phone: '',
    payment_method: goods.payment_method === 'both' ? 'card' : goods.payment_method,
    quantity: 1, notes: '',
    delivery_address: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [squareReady, setSquareReady] = useState(false)
  const [optionsSelected, setOptionsSelected] = useState({})
  const [layerPath, setLayerPath] = useState([])
  const cardRef = useRef(null)
  const paymentsRef = useRef(null)

  const optionGroups = !isLayers && goods.options?.type === 'groups' ? goods.options.groups : []

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

  const totalPrice = goods.price * form.quantity

  async function submit(e) {
    e.preventDefault()
    if (!form.last_name || !form.email) { setError('氏名・メールアドレスは必須です'); return }
    if (isDelivery && !form.delivery_address.trim()) { setError('お届け先住所を入力してください'); return }
    setSubmitting(true)
    setError('')

    let squarePaymentId = null

    if (selectedPayment === 'card' && totalPrice > 0) {
      if (!cardRef.current) { setError('カード情報を入力してください。'); setSubmitting(false); return }
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK') {
        setError('カード情報の処理に失敗しました。入力内容をご確認ください。')
        setSubmitting(false); return
      }
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
      body: JSON.stringify({ goods_id: goods.id, ...form, square_payment_id: squarePaymentId, options_selected: Object.keys(optionsSelected).length > 0 ? optionsSelected : null, layers_path: isLayers && layerPath.length > 0 ? layerPath : null, delivery_address: form.delivery_address || null }),
    })
    setSubmitting(false)
    if (res.ok) {
      setDone(true)
      onComplete()
      if (form.email) {
        fetch('/api/customer/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_name: form.last_name, first_name: form.first_name, phone: form.phone, email: form.email }),
        }).catch(() => {})
      }
    } else {
      const d = await res.json()
      setError(d.error === 'Out of stock' ? '申し訳ありませんが売り切れました' : '送信に失敗しました。もう一度お試しください。')
    }
  }

  const maxQty = goods.stock >= 0 ? goods.stock : 99

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3560' }}>{goods.title}</div>
            <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>¥{goods.price.toLocaleString()} / 個</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
        </div>

        {done ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#2e7d32', marginBottom: 8 }}>ご注文ありがとうございます</div>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>確認メールをお送りしました。担当よりご連絡いたします。</p>
            <button onClick={onClose}
              style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#1a3560', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              閉じる
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: '20px 24px 24px' }}>
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
            {isDelivery && (
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>お届け先住所 *</label>
                <textarea value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
                  rows={3} placeholder="〒000-0000&#10;東京都〇〇区〇〇 1-2-3&#10;マンション名 部屋番号" style={{ ...inp, resize: 'vertical' }} />
              </div>
            )}
            {isLayers && (
              <div style={{ marginBottom: 14 }}>
                <LayerOptionPicker
                  options={goods.options}
                  value={layerPath}
                  onChange={setLayerPath}
                />
              </div>
            )}
            {!isLayers && optionGroups.map((group, i) => {
              // 新形式: モデルごとに選択肢が違う
              if (group.type === 'models' && group.model_choices) {
                const sel = optionsSelected[group.name] // {model_id, model_name, choice}
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
                            onClick={() => {
                              if (modelSoldOut) return
                              setOptionsSelected(prev => ({ ...prev, [group.name]: { model_id: mc.model_id, model_name: mc.model_name, choice: null } }))
                            }}
                            style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${isSelected ? '#1a3560' : modelSoldOut ? '#eee' : '#ddd'}`, background: isSelected ? '#1a3560' : modelSoldOut ? '#f5f5f5' : '#fff', color: isSelected ? '#fff' : modelSoldOut ? '#bbb' : '#555', cursor: modelSoldOut ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
                            {mc.model_name}{modelSoldOut ? ' (満員)' : ''}
                          </button>
                        )
                      })}
                    </div>
                    {selectedModelData && selectedModelData.choices.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <label style={{ ...lbl, marginBottom: 6 }}>時間帯・内容を選択 *</label>
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

              // 手動選択肢（従来形式）
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <label style={lbl}>{group.name} *</label>
                  {group.multiple ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {group.choices.map(rawChoice => {
                        const choice = typeof rawChoice === 'string' ? { name: rawChoice, stock: -1 } : rawChoice
                        const soldOut = choice.stock === 0
                        const selected = (optionsSelected[group.name] || []).includes(choice.name)
                        return (
                          <button key={choice.name} type="button" disabled={soldOut}
                            onClick={() => {
                              if (soldOut) return
                              const current = optionsSelected[group.name] || []
                              const next = selected ? current.filter(c => c !== choice.name) : [...current, choice.name]
                              setOptionsSelected(prev => ({ ...prev, [group.name]: next }))
                            }}
                            style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${selected ? '#1a3560' : soldOut ? '#eee' : '#ddd'}`, background: selected ? '#1a3560' : soldOut ? '#f5f5f5' : '#fff', color: selected ? '#fff' : soldOut ? '#bbb' : '#555', cursor: soldOut ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
                            {choice.name}{soldOut ? ' (売切)' : choice.stock > 0 && choice.stock <= 5 ? ` 残${choice.stock}` : ''}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {group.choices.map(rawChoice => {
                        const choice = typeof rawChoice === 'string' ? { name: rawChoice, stock: -1 } : rawChoice
                        const soldOut = choice.stock === 0
                        const selected = optionsSelected[group.name] === choice.name
                        return (
                          <button key={choice.name} type="button" disabled={soldOut}
                            onClick={() => { if (!soldOut) setOptionsSelected(prev => ({ ...prev, [group.name]: choice.name })) }}
                            style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${selected ? '#1a3560' : soldOut ? '#eee' : '#ddd'}`, background: selected ? '#1a3560' : soldOut ? '#f5f5f5' : '#fff', color: selected ? '#fff' : soldOut ? '#bbb' : '#555', cursor: soldOut ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
                            {choice.name}{soldOut ? ' (売切)' : choice.stock > 0 && choice.stock <= 5 ? ` 残${choice.stock}` : ''}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

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
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: 12, fontSize: 13, color: '#795548', marginBottom: 14 }}>
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
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="ご質問・ご要望などあればご記入ください" style={{ ...inp, resize: 'vertical' }} />
            </div>

            <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#555' }}>合計</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#1a3560' }}>¥{totalPrice.toLocaleString()}</span>
            </div>

            {error && (
              <div style={{ background: '#ffebee', color: '#c62828', borderRadius: 8, padding: '10px 14px', fontSize: 14, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: submitting ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 16, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? '送信中...' : selectedPayment === 'card' ? '決済して注文する' : '注文する'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }
const inp = { width: '100%', padding: '9px 11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
