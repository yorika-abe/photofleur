'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import LayerOptionPicker from '@/components/LayerOptionPicker'
import { buildSelectionsLabel, getLeafChoicePrice } from '@/lib/product-layers'

export default function GoodsShop() {
  const [goods, setGoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [orderTarget, setOrderTarget] = useState(null)
  const { addItem } = useCart()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/goods').then(r => r.json()).then(d => {
      setGoods(d.goods || [])
      setLoading(false)
    })
  }, [])

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
                onClick={() => !soldOut && setOrderTarget(g)}
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

      {orderTarget && (
        <OrderModal
          goods={orderTarget}
          onClose={() => setOrderTarget(null)}
          onAddToCart={(item) => { addItem(item); setOrderTarget(null) }}
          onBuyNow={(item) => { addItem(item); setOrderTarget(null); router.push('/cart-checkout') }}
        />
      )}
    </div>
  )
}

function OrderModal({ goods, onClose, onAddToCart, onBuyNow }) {
  const isDelivery = !!goods.options?.is_delivery
  const isLayers = goods.options?.type === 'layers'
  const optionGroups = !isLayers && goods.options?.type === 'groups' ? goods.options.groups : []
  const layers = isLayers ? (goods.options?.layers || []) : []

  const { items } = useCart()
  const alreadyInCart = items.filter(i => i.type === 'goods' && i.goodsId === goods.id).reduce((s, i) => s + (i.quantity || 1), 0)

  const [quantity, setQuantity] = useState(1)
  const [layerPath, setLayerPath] = useState([])
  const [optionsSelected, setOptionsSelected] = useState({})
  const [cartAdded, setCartAdded] = useState(false)

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
  const totalPrice = unitPrice * quantity
  const maxQty = goods.stock >= 0 ? Math.max(0, goods.stock - alreadyInCart) : 99

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
      type: 'goods',
      name: goods.title,
      title: goods.title,
      image: goods.image,
      price: unitPrice,
      quantity,
      goodsId: goods.id,
      layers_path: isLayers && layerPath.length > 0 ? layerPath : null,
      options_selected: !isLayers && Object.keys(optionsSelected).length > 0 ? optionsSelected : null,
      _label: label || null,
      is_delivery: isDelivery,
      payment_method: goods.payment_method,
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3560' }}>{goods.title}</div>
            <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
              ¥{unitPrice.toLocaleString()} / 個
              {choicePrice != null && choicePrice !== goods.price && <span style={{ fontSize: 11, color: '#aaa', marginLeft: 4 }}>（選択肢価格）</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          {isLayers && (
            <div style={{ marginBottom: 18 }}>
              <LayerOptionPicker options={goods.options} value={layerPath} onChange={setLayerPath} />
              {hasOptions && !isLayersComplete && <p style={{ fontSize: 12, color: '#c62828', marginTop: 6 }}>⚠ 全ての選択肢を選んでください</p>}
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
                    const selected = group.multiple ? (optionsSelected[group.name] || []).includes(choice.name) : optionsSelected[group.name] === choice.name
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

          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>数量</label>
            <input type="number" min="1" max={maxQty} value={quantity}
              onChange={e => setQuantity(Math.max(1, Math.min(maxQty, Number(e.target.value))))}
              style={{ padding: '9px 11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, width: 100 }} />
          </div>

          {hasOptions && !isSelectionsComplete && (
            <div style={{ background: '#ffebee', color: '#c62828', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
              ⚠ 全ての選択肢を選んでください
            </div>
          )}
          {maxQty === 0 && (
            <div style={{ background: '#fff3e0', color: '#e65100', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
              ⚠ この商品はすでにカートに追加済みです（在庫上限）
            </div>
          )}

          <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: '#555' }}>合計</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1a3560' }}>¥{totalPrice.toLocaleString()}</span>
          </div>

          <button type="button" disabled={maxQty === 0 || (hasOptions && !isSelectionsComplete)}
            onClick={() => { if (maxQty === 0 || (hasOptions && !isSelectionsComplete)) return; onBuyNow(buildCartItem()) }}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: (maxQty === 0 || (hasOptions && !isSelectionsComplete)) ? '#ccc' : '#1a3560', color: '#fff', fontWeight: 700, fontSize: 16, cursor: (maxQty === 0 || (hasOptions && !isSelectionsComplete)) ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
            今すぐ購入
          </button>
          <button type="button" disabled={maxQty === 0 || (hasOptions && !isSelectionsComplete)}
            onClick={() => {
              if (maxQty === 0 || (hasOptions && !isSelectionsComplete)) return
              onAddToCart(buildCartItem())
              setCartAdded(true)
              setTimeout(() => setCartAdded(false), 2000)
            }}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: `2px solid ${(maxQty === 0 || (hasOptions && !isSelectionsComplete)) ? '#ddd' : '#1a3560'}`, background: cartAdded ? '#e8f5e9' : '#fff', color: cartAdded ? '#2e7d32' : (maxQty === 0 || (hasOptions && !isSelectionsComplete)) ? '#bbb' : '#1a3560', fontWeight: 700, fontSize: 15, cursor: (maxQty === 0 || (hasOptions && !isSelectionsComplete)) ? 'not-allowed' : 'pointer' }}>
            {cartAdded ? '✓ カートに追加しました' : '🛒 カートに入れる'}
          </button>
        </div>
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }
