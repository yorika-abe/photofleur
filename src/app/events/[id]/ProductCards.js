'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'

function getOptionGroups(product) {
  const opts = product.options
  if (opts && typeof opts === 'object' && !Array.isArray(opts) && opts.type === 'groups') {
    return opts.groups || []
  }
  return []
}

export default function ProductCards({ products, eventId, slotLabels = [], eventModels = [], eventDate = '', eventLocation = '' }) {
  const [selected, setSelected] = useState(null)
  const [selections, setSelections] = useState({})
  const [cartAdded, setCartAdded] = useState(false)
  const { addItem } = useCart()
  const router = useRouter()

  if (!products || products.length === 0) return null

  function openModal(p) {
    setSelected(p)
    setSelections({})
    setCartAdded(false)
  }

  function closeModal() {
    setSelected(null)
    setCartAdded(false)
  }

  function updateSelection(groupIdx, value, multiple) {
    if (multiple) {
      setSelections(prev => {
        const current = Array.isArray(prev[groupIdx]) ? prev[groupIdx] : []
        const isSelected = current.includes(value)
        return { ...prev, [groupIdx]: isSelected ? current.filter(v => v !== value) : [...current, value] }
      })
    } else {
      setSelections(prev => ({ ...prev, [groupIdx]: value }))
    }
  }

  function buildCartItem() {
    if (!selected) return null
    const groups = getOptionGroups(selected)
    const selectedModelIds = []
    const selectionData = {}

    groups.forEach((group, idx) => {
      const val = selections[idx]
      if (group.type === 'models') {
        const ids = Array.isArray(val) ? val : (val ? [val] : [])
        selectedModelIds.push(...ids)
        selectionData['model'] = ids.map(id => eventModels.find(m => m.id === id)?.name).filter(Boolean)
      } else if (group.type === 'slots') {
        selectionData['slot'] = Array.isArray(val) ? val.join(', ') : (val || '')
      } else if (group.type === 'manual') {
        selectionData[group.name || `option_${idx}`] = Array.isArray(val) ? val : (val ? [val] : [])
      }
    })

    const selectionSummary = Object.entries(selectionData)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : v !== ''))
      .join(' / ')

    return {
      type: 'product',
      productId: selected.id,
      name: selected.name,
      image: selected.image,
      price: selected.price || 0,
      eventId,
      eventDate,
      eventLocation,
      selections: selectionData,
      selectedModelIds,
      selectionSummary,
    }
  }

  function handleAddToCart() {
    const item = buildCartItem()
    if (!item) return
    addItem(item)
    setCartAdded(true)
    setTimeout(() => setCartAdded(false), 2500)
  }

  function handleBuyNow() {
    const item = buildCartItem()
    if (!item) return
    addItem(item)
    closeModal()
    router.push('/cart-checkout')
  }

  const selectedGroups = selected ? getOptionGroups(selected) : []
  const hasBookableOptions = selectedGroups.length > 0

  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#333', marginBottom: 16 }}>予約商品</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {products.map(p => (
            <div key={p.id}
              onClick={() => openModal(p)}
              style={{ background: '#fff', borderRadius: 14, border: '1px solid #e0ecf8', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,53,96,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              <div style={{ aspectRatio: '1/1', overflow: 'hidden', background: '#f0f4fb' }}>
                {p.image
                  ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🛍️</div>
                }
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3560', marginBottom: 2 }}>{p.name}</div>
                {p.available_slots?.length > 0 && (
                  <div style={{ fontSize: 11, color: '#5bbfd6', fontWeight: 600, marginBottom: 4 }}>
                    🕐 {p.available_slots.join(' / ')}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#555' }}>¥{(p.price || 0).toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: p.stock > 0 ? '#999' : '#e53935', fontWeight: p.stock <= 0 ? 700 : 400 }}>
                    {p.stock <= 0 ? '在庫なし' : `在庫 ${p.stock}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div onClick={closeModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, maxWidth: 520, width: '100%', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
            {selected.image && (
              <img src={selected.image} alt={selected.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
            )}
            <div style={{ padding: '24px 24px 28px' }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3560', marginBottom: 8 }}>{selected.name}</div>
              {selected.available_slots?.length > 0 && (
                <div style={{ fontSize: 13, color: '#5bbfd6', fontWeight: 600, marginBottom: 12 }}>
                  🕐 {selected.available_slots.join(' / ')}
                </div>
              )}
              {selected.description && (
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{selected.description}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #f0f0f0', marginBottom: 20 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#1a3560' }}>¥{(selected.price || 0).toLocaleString()}</span>
                <span style={{ fontSize: 13, color: selected.stock <= 0 ? '#e53935' : '#888', fontWeight: selected.stock <= 0 ? 700 : 400 }}>
                  {selected.stock <= 0 ? '在庫なし' : `在庫 ${selected.stock}件`}
                </span>
              </div>

              {hasBookableOptions ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {selectedGroups.map((group, idx) => {
                    const val = selections[idx]

                    if (group.type === 'slots') {
                      const isMultiple = group.multiple === true
                      return (
                        <div key={idx}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a3560', marginBottom: 8 }}>
                            📅 時間枠を選択{isMultiple ? '（複数可）' : ''}
                          </label>
                          {isMultiple ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {slotLabels.map(slotLabel => (
                                <label key={slotLabel} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '7px 10px', borderRadius: 8, background: (val || []).includes(slotLabel) ? '#e0f7fa' : '#f8f8f8' }}>
                                  <input type="checkbox" checked={(val || []).includes(slotLabel)} onChange={() => updateSelection(idx, slotLabel, true)} />
                                  <span style={{ fontSize: 13 }}>{slotLabel}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <select value={val || ''} onChange={e => updateSelection(idx, e.target.value, false)}
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                              <option value="">選択してください</option>
                              {slotLabels.map(slotLabel => (
                                <option key={slotLabel} value={slotLabel}>{slotLabel}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    }

                    if (group.type === 'models') {
                      const isMultiple = group.multiple !== false
                      return (
                        <div key={idx}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a3560', marginBottom: 8 }}>
                            👤 モデルを選択{isMultiple ? '（複数可）' : ''}
                          </label>
                          {isMultiple ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {eventModels.map(m => (
                                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: (val || []).includes(m.id) ? '#e8f5e9' : '#f8f8f8' }}>
                                  <input type="checkbox" checked={(val || []).includes(m.id)} onChange={() => updateSelection(idx, m.id, true)} />
                                  {m.image && <img src={m.image} alt={m.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <select value={val || ''} onChange={e => updateSelection(idx, e.target.value, false)}
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                              <option value="">選択してください</option>
                              {eventModels.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    }

                    if (group.type === 'manual') {
                      const choices = (group.choices || []).filter(Boolean)
                      const isMultiple = group.multiple === true
                      return (
                        <div key={idx}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a3560', marginBottom: 8 }}>
                            {group.name || '選択肢'}{isMultiple ? '（複数可）' : ''}
                          </label>
                          {isMultiple ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {choices.map(choice => (
                                <label key={choice} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '7px 10px', borderRadius: 8, background: (val || []).includes(choice) ? '#e8f0fe' : '#f8f8f8' }}>
                                  <input type="checkbox" checked={(val || []).includes(choice)} onChange={() => updateSelection(idx, choice, true)} />
                                  <span style={{ fontSize: 13 }}>{choice}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <select value={val || ''} onChange={e => updateSelection(idx, e.target.value, false)}
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                              <option value="">選択してください</option>
                              {choices.map(choice => (
                                <option key={choice} value={choice}>{choice}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    }

                    return null
                  })}

                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cartAdded ? (
                      <div style={{ background: '#e8f5e9', borderRadius: 10, padding: '12px', textAlign: 'center', color: '#2e7d32', fontWeight: 700 }}>
                        ✓ カートに追加しました
                      </div>
                    ) : (
                      <>
                        <button onClick={handleBuyNow}
                          style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: '#1a3560', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                          今すぐ購入
                        </button>
                        <button onClick={handleAddToCart}
                          style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: '2px solid #1a3560', background: '#fff', color: '#1a3560', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                          🛒 カートに追加
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>ご予約後、当日スタッフまでお申し付けください。</p>
              )}

              <button onClick={closeModal}
                style={{ marginTop: 16, width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #ddd', background: '#f5f5f5', color: '#555', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
