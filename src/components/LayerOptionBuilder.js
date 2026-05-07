'use client'
import { genId } from '@/lib/product-layers'

// Props:
//   layers: array of layer objects
//   onChange: (newLayers) => void
//   models: array of {id, name} for model selection
//   eventModels: array of {id, name} specifically in this event (for event context)
//   allowSlots: boolean - show slots option (event only)
//   slotLabels: array of slot label strings (for slots type auto-add)

export default function LayerOptionBuilder({ layers = [], onChange, models = [], eventModels = [], allowSlots = false, slotLabels = [] }) {
  function update(newLayers) { onChange(newLayers) }

  function addLayer(type) {
    const id = genId()
    const layer = {
      id, type, name: '', multiple: false, no_duplicate: false,
      ...(type === 'manual' ? { choices: [] } : {}),
      ...(type === 'models' ? { model_choices: [] } : {}),
    }
    update([...layers, layer])
  }

  function removeLayer(layerIdx) {
    update(layers.slice(0, layerIdx))
  }

  function updateLayer(layerIdx, key, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : { ...l, [key]: val }))
  }

  // --- Manual choices ---
  function addManualChoice(layerIdx) {
    const id = genId()
    const parentLayer = layerIdx > 0 ? layers[layerIdx - 1] : null
    const parentChoices = parentLayer
      ? (parentLayer.type === 'manual' || parentLayer.type === 'slots' ? parentLayer.choices : parentLayer.model_choices) || []
      : []
    const parent_stocks = layerIdx > 0
      ? Object.fromEntries(parentChoices.map(pc => [pc.id, -1]))
      : undefined
    const newChoice = { id, name: '', stock: -1, ...(parent_stocks ? { parent_stocks } : {}) }
    update(layers.map((l, i) => i !== layerIdx ? l : { ...l, choices: [...(l.choices || []), newChoice] }))
  }

  function removeManualChoice(layerIdx, choiceId) {
    update(layers.map((l, i) => {
      if (i === layerIdx) return { ...l, choices: (l.choices || []).filter(c => c.id !== choiceId) }
      if (i > layerIdx) {
        return {
          ...l,
          choices: (l.choices || []).map(c => {
            if (!c.parent_stocks || !(choiceId in c.parent_stocks)) return c
            const { [choiceId]: _, ...rest } = c.parent_stocks
            return { ...c, parent_stocks: rest }
          }),
          model_choices: (l.model_choices || []).map(mc => {
            if (!mc.parent_stocks || !(choiceId in mc.parent_stocks)) return mc
            const { [choiceId]: _, ...rest } = mc.parent_stocks
            return { ...mc, parent_stocks: rest }
          }),
        }
      }
      return l
    }))
  }

  function updateManualChoice(layerIdx, choiceId, field, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      choices: (l.choices || []).map(c => c.id !== choiceId ? c : { ...c, [field]: val }),
    }))
  }

  function toggleParentLink(layerIdx, choiceId, parentId) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      choices: (l.choices || []).map(c => {
        if (c.id !== choiceId) return c
        const ps = c.parent_stocks || {}
        if (parentId in ps) { const { [parentId]: _, ...rest } = ps; return { ...c, parent_stocks: rest } }
        return { ...c, parent_stocks: { ...ps, [parentId]: -1 } }
      }),
    }))
  }

  function updateParentStock(layerIdx, choiceId, parentId, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      choices: (l.choices || []).map(c => c.id !== choiceId ? c : {
        ...c, parent_stocks: { ...(c.parent_stocks || {}), [parentId]: val === '' ? -1 : Number(val) },
      }),
    }))
  }

  // --- Model choices ---
  function toggleModel(layerIdx, model) {
    const layerState = layers[layerIdx]
    const exists = (layerState?.model_choices || []).some(mc => mc.model_id === model.id)
    const parentLayer = layerIdx > 0 ? layers[layerIdx - 1] : null
    const parentChoices = parentLayer
      ? (parentLayer.type === 'manual' || parentLayer.type === 'slots' ? parentLayer.choices : parentLayer.model_choices) || []
      : []

    update(layers.map((l, i) => {
      if (i !== layerIdx) return l
      if (exists) {
        return { ...l, model_choices: l.model_choices.filter(mc => mc.model_id !== model.id) }
      }
      const id = genId()
      const parent_stocks = layerIdx > 0
        ? Object.fromEntries(parentChoices.map(pc => [pc.id, -1]))
        : undefined
      return {
        ...l,
        model_choices: [...(l.model_choices || []), {
          id, model_id: model.id, model_name: model.name, stock: -1,
          ...(parent_stocks ? { parent_stocks } : {}),
        }],
      }
    }))
  }

  function selectAllEventModels(layerIdx) {
    const existing = new Set((layers[layerIdx]?.model_choices || []).map(mc => mc.model_id))
    const parentLayer = layerIdx > 0 ? layers[layerIdx - 1] : null
    const parentChoices = parentLayer
      ? (parentLayer.type === 'manual' || parentLayer.type === 'slots' ? parentLayer.choices : parentLayer.model_choices) || []
      : []
    const parent_stocks = layerIdx > 0 ? Object.fromEntries(parentChoices.map(pc => [pc.id, -1])) : undefined
    const toAdd = eventModels.filter(m => !existing.has(m.id)).map(m => ({
      id: genId(), model_id: m.id, model_name: m.name, stock: -1,
      ...(parent_stocks ? { parent_stocks } : {}),
    }))
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l, model_choices: [...(l.model_choices || []), ...toAdd],
    }))
  }

  function updateModelChoice(layerIdx, mcId, field, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      model_choices: (l.model_choices || []).map(mc => mc.id !== mcId ? mc : { ...mc, [field]: val }),
    }))
  }

  function toggleModelParentLink(layerIdx, mcId, parentId) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      model_choices: (l.model_choices || []).map(mc => {
        if (mc.id !== mcId) return mc
        const ps = mc.parent_stocks || {}
        if (parentId in ps) { const { [parentId]: _, ...rest } = ps; return { ...mc, parent_stocks: rest } }
        return { ...mc, parent_stocks: { ...ps, [parentId]: -1 } }
      }),
    }))
  }

  function updateModelParentStock(layerIdx, mcId, parentId, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      model_choices: (l.model_choices || []).map(mc => mc.id !== mcId ? mc : {
        ...mc, parent_stocks: { ...(mc.parent_stocks || {}), [parentId]: val === '' ? -1 : Number(val) },
      }),
    }))
  }

  // --- Slots (event only) ---
  function addSlotsLayer() { addLayer('slots') }

  function initSlotChoices(layerIdx) {
    const parentLayer = layerIdx > 0 ? layers[layerIdx - 1] : null
    const parentChoices = parentLayer
      ? (parentLayer.type === 'manual' || parentLayer.type === 'slots' ? parentLayer.choices : parentLayer.model_choices) || []
      : []
    const choices = slotLabels.map((label, si) => {
      const id = `slot_${si}`
      const parent_stocks = layerIdx > 0 && parentChoices.length > 0
        ? Object.fromEntries(parentChoices.map(pc => [pc.id, -1]))
        : undefined
      return { id, name: label, stock: -1, ...(parent_stocks ? { parent_stocks } : {}) }
    })
    update(layers.map((l, i) => i !== layerIdx ? l : { ...l, choices }))
  }

  // --- Per-choice pricing (leaf layer only) ---
  function updateChoicePrice(layerIdx, choiceKey, choiceId, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      [choiceKey]: (l[choiceKey] || []).map(c => c.id !== choiceId ? c : {
        ...c, price: val === '' ? null : Number(val),
      }),
    }))
  }

  function addChoiceCost(layerIdx, choiceKey, choiceId) {
    const id = genId()
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      [choiceKey]: (l[choiceKey] || []).map(c => c.id !== choiceId ? c : {
        ...c, cost_items: [...(c.cost_items || []), { id, name: '', amount: 0, per_unit: true }],
      }),
    }))
  }

  function updateChoiceCost(layerIdx, choiceKey, choiceId, itemId, field, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      [choiceKey]: (l[choiceKey] || []).map(c => c.id !== choiceId ? c : {
        ...c, cost_items: (c.cost_items || []).map(item => item.id !== itemId ? item : { ...item, [field]: val }),
      }),
    }))
  }

  function removeChoiceCost(layerIdx, choiceKey, choiceId, itemId) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      [choiceKey]: (l[choiceKey] || []).map(c => c.id !== choiceId ? c : {
        ...c, cost_items: (c.cost_items || []).filter(item => item.id !== itemId),
      }),
    }))
  }

  const inp = { padding: '6px 9px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }

  function renderPerChoicePricing(layerIdx, choiceKey, choice) {
    const layer = layers[layerIdx]
    if (layerIdx !== layers.length - 1 || !layer.per_choice_pricing) return null
    return (
      <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', fontWeight: 600 }}>料金</span>
          <span style={{ fontSize: 12, color: '#555' }}>¥</span>
          <input type="number" value={choice.price ?? ''} placeholder="デフォルト使用"
            onChange={e => updateChoicePrice(layerIdx, choiceKey, choice.id, e.target.value)}
            style={{ ...inp, width: 100, textAlign: 'right' }} />
          <span style={{ fontSize: 10, color: '#aaa' }}>空欄=商品デフォルト価格</span>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 4 }}>販管費（仕入れ・送料など）</div>
          {(choice.cost_items || []).map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
              <input value={item.name} onChange={e => updateChoiceCost(layerIdx, choiceKey, choice.id, item.id, 'name', e.target.value)}
                placeholder="項目名" style={{ ...inp, width: 120 }} />
              <span style={{ fontSize: 11, color: '#555' }}>¥</span>
              <input type="number" value={item.amount}
                onChange={e => updateChoiceCost(layerIdx, choiceKey, choice.id, item.id, 'amount', Number(e.target.value))}
                style={{ ...inp, width: 80, textAlign: 'right' }} />
              <select value={item.per_unit ? 'unit' : 'fixed'}
                onChange={e => updateChoiceCost(layerIdx, choiceKey, choice.id, item.id, 'per_unit', e.target.value === 'unit')}
                style={{ ...inp, fontSize: 11, padding: '6px 4px' }}>
                <option value="unit">1個あたり</option>
                <option value="fixed">まとめて</option>
              </select>
              <button type="button" onClick={() => removeChoiceCost(layerIdx, choiceKey, choice.id, item.id)}
                style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 16, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => addChoiceCost(layerIdx, choiceKey, choice.id)}
            style={{ fontSize: 11, color: '#888', background: 'none', border: '1px dashed #ddd', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', marginTop: 2 }}>
            + 販管費を追加
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {layers.map((layer, layerIdx) => {
        const isLeaf = layerIdx === layers.length - 1
        const parentLayer = layerIdx > 0 ? layers[layerIdx - 1] : null
        const parentChoices = parentLayer
          ? (parentLayer.type === 'manual' || parentLayer.type === 'slots' ? parentLayer.choices : parentLayer.model_choices) || []
          : []
        const layerColor = layer.type === 'models' ? '#e8f5e9' : layer.type === 'slots' ? '#e0f7fa' : '#f8f9ff'
        const layerBorder = layer.type === 'models' ? '#c8e6c9' : layer.type === 'slots' ? '#b2ebf2' : '#e0e0f0'
        const labelColor = layer.type === 'models' ? '#2e7d32' : layer.type === 'slots' ? '#0097a7' : '#1a3560'

        return (
          <div key={layer.id} style={{ marginBottom: 12 }}>
            <div style={{ background: layerColor, border: `1px solid ${layerBorder}`, borderRadius: 12, padding: '14px 16px' }}>
              {/* Layer header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: labelColor }}>
                    {layerIdx === 0 ? '選択肢' : `サブ選択肢 ${layerIdx}`}
                    {layer.type === 'models' ? ' 👤 モデル' : layer.type === 'slots' ? ' 📅 時間枠' : ' 📝 手動'}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#666', cursor: 'pointer' }}>
                    <input type="checkbox" checked={layer.multiple} onChange={e => updateLayer(layerIdx, 'multiple', e.target.checked)} />
                    複数選択可
                  </label>
                  {layerIdx > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#666', cursor: 'pointer' }}>
                      <input type="checkbox" checked={layer.no_duplicate} onChange={e => updateLayer(layerIdx, 'no_duplicate', e.target.checked)} />
                      重複防止
                    </label>
                  )}
                  {isLeaf && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#b85c00', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="checkbox" checked={layer.per_choice_pricing || false}
                        onChange={e => updateLayer(layerIdx, 'per_choice_pricing', e.target.checked)} />
                      💰 選択肢ごとに料金・販管費を設定
                    </label>
                  )}
                </div>
                <button type="button" onClick={() => removeLayer(layerIdx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>

              {/* Manual choices */}
              {layer.type === 'manual' && (
                <div>
                  <input value={layer.name} onChange={e => updateLayer(layerIdx, 'name', e.target.value)}
                    placeholder="グループ名（例：カラー）"
                    style={{ ...inp, width: '100%', marginBottom: 8, boxSizing: 'border-box' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(layer.choices || []).map(choice => (
                      <div key={choice.id} style={{ background: '#fff', border: '1px solid #e8eaf6', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: parentChoices.length > 0 ? 6 : 0 }}>
                          <input value={choice.name} onChange={e => updateManualChoice(layerIdx, choice.id, 'name', e.target.value)}
                            placeholder="選択肢名" style={{ ...inp, flex: 1 }} />
                          {layerIdx === 0 && (
                            <>
                              <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>在庫</span>
                              <input type="number" value={choice.stock < 0 ? '' : choice.stock} placeholder="∞"
                                onChange={e => updateManualChoice(layerIdx, choice.id, 'stock', e.target.value === '' ? -1 : Number(e.target.value))}
                                style={{ ...inp, width: 52, textAlign: 'center' }} />
                            </>
                          )}
                          <button type="button" onClick={() => removeManualChoice(layerIdx, choice.id)}
                            style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 16, cursor: 'pointer', padding: '0 3px' }}>×</button>
                        </div>
                        {layerIdx > 0 && parentChoices.map(pc => {
                          const linked = choice.parent_stocks && pc.id in choice.parent_stocks
                          const ps = choice.parent_stocks?.[pc.id] ?? -1
                          return (
                            <div key={pc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingLeft: 8 }}>
                              <input type="checkbox" checked={linked}
                                onChange={() => toggleParentLink(layerIdx, choice.id, pc.id)} />
                              <span style={{ fontSize: 12, color: '#555', minWidth: 60 }}>{pc.name || pc.model_name || '?'}</span>
                              {linked && (
                                <>
                                  <span style={{ fontSize: 11, color: '#888' }}>在庫</span>
                                  <input type="number" value={ps < 0 ? '' : ps} placeholder="∞"
                                    onChange={e => updateParentStock(layerIdx, choice.id, pc.id, e.target.value)}
                                    style={{ ...inp, width: 52, textAlign: 'center' }} />
                                </>
                              )}
                            </div>
                          )
                        })}
                        {renderPerChoicePricing(layerIdx, 'choices', choice)}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addManualChoice(layerIdx)}
                    style={{ marginTop: 8, fontSize: 12, color: '#555', background: 'none', border: '1px dashed #bbb', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                    + 選択肢を追加
                  </button>
                </div>
              )}

              {/* Model choices */}
              {layer.type === 'models' && (
                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {eventModels.length > 0 && (
                      <button type="button" onClick={() => selectAllEventModels(layerIdx)}
                        style={{ fontSize: 11, color: '#2e7d32', background: 'none', border: '1px solid #2e7d32', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}>
                        参加モデル全員追加
                      </button>
                    )}
                    <button type="button" onClick={() => update(layers.map((l, i) => i !== layerIdx ? l : { ...l, model_choices: [] }))}
                      style={{ fontSize: 11, color: '#888', background: 'none', border: '1px solid #ddd', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>
                      クリア
                    </button>
                    <span style={{ fontSize: 11, color: '#888', alignSelf: 'center' }}>{(layer.model_choices || []).length}名選択中</span>
                  </div>
                  {eventModels.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 11, color: '#2e7d32', fontWeight: 600, marginBottom: 4 }}>参加モデル</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                        {eventModels.map(m => {
                          const isSel = (layer.model_choices || []).some(mc => mc.model_id === m.id)
                          return (
                            <button key={m.id} type="button" onClick={() => toggleModel(layerIdx, m)}
                              style={{ padding: '3px 10px', borderRadius: 7, border: `2px solid ${isSel ? '#4caf50' : '#ddd'}`, background: isSel ? '#f1f8e9' : '#fafafa', cursor: 'pointer', fontWeight: isSel ? 700 : 400, fontSize: 12 }}>
                              {isSel ? '✓ ' : ''}{m.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {models.filter(m => !eventModels.some(em => em.id === m.id)).length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 4 }}>その他のモデル</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {models.filter(m => !eventModels.some(em => em.id === m.id)).map(m => {
                          const isSel = (layer.model_choices || []).some(mc => mc.model_id === m.id)
                          return (
                            <button key={m.id} type="button" onClick={() => toggleModel(layerIdx, m)}
                              style={{ padding: '3px 10px', borderRadius: 7, border: `2px solid ${isSel ? '#4caf50' : '#ddd'}`, background: isSel ? '#f1f8e9' : '#fafafa', cursor: 'pointer', fontWeight: isSel ? 700 : 400, fontSize: 12 }}>
                              {isSel ? '✓ ' : ''}{m.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {(layer.model_choices || []).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      {layer.model_choices.map(mc => (
                        <div key={mc.id} style={{ background: '#fff', border: '1px solid #c8e6c9', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: '#2e7d32', marginBottom: 6 }}>{mc.model_name}</div>
                          {layerIdx === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, color: '#888' }}>在庫</span>
                              <input type="number" value={mc.stock < 0 ? '' : mc.stock} placeholder="∞"
                                onChange={e => updateModelChoice(layerIdx, mc.id, 'stock', e.target.value === '' ? -1 : Number(e.target.value))}
                                style={{ ...inp, width: 58, textAlign: 'center' }} />
                            </div>
                          ) : parentChoices.map(pc => {
                            const linked = mc.parent_stocks && pc.id in mc.parent_stocks
                            const ps = mc.parent_stocks?.[pc.id] ?? -1
                            return (
                              <div key={pc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <input type="checkbox" checked={linked}
                                  onChange={() => toggleModelParentLink(layerIdx, mc.id, pc.id)} />
                                <span style={{ fontSize: 12, color: '#555', minWidth: 60 }}>{pc.name || pc.model_name || '?'}</span>
                                {linked && (
                                  <>
                                    <span style={{ fontSize: 11, color: '#888' }}>在庫</span>
                                    <input type="number" value={ps < 0 ? '' : ps} placeholder="∞"
                                      onChange={e => updateModelParentStock(layerIdx, mc.id, pc.id, e.target.value)}
                                      style={{ ...inp, width: 52, textAlign: 'center' }} />
                                  </>
                                )}
                              </div>
                            )
                          })}
                          {renderPerChoicePricing(layerIdx, 'model_choices', mc)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Slots */}
              {layer.type === 'slots' && (
                <div>
                  {(layer.choices || []).length === 0 ? (
                    <div>
                      {slotLabels.length > 0 && (
                        <button type="button" onClick={() => initSlotChoices(layerIdx)}
                          style={{ fontSize: 12, color: '#0097a7', background: '#e0f7fa', border: '1px solid #b2ebf2', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                          📅 {slotLabels.length}枠を読み込んで在庫設定
                        </button>
                      )}
                      <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                        イベントの予約受付枠が自動で表示されます{slotLabels.length > 0 ? '（在庫を設定する場合は上のボタンをクリック）' : ''}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(layer.choices || []).map(choice => (
                        <div key={choice.id} style={{ background: '#fff', border: '1px solid #b2ebf2', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: parentChoices.length > 0 ? 6 : 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#0097a7', flex: 1 }}>{choice.name}</span>
                            {layerIdx === 0 && (
                              <>
                                <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>在庫</span>
                                <input type="number" value={choice.stock < 0 ? '' : choice.stock} placeholder="∞"
                                  onChange={e => updateManualChoice(layerIdx, choice.id, 'stock', e.target.value === '' ? -1 : Number(e.target.value))}
                                  style={{ ...inp, width: 52, textAlign: 'center' }} />
                              </>
                            )}
                          </div>
                          {layerIdx > 0 && parentChoices.map(pc => {
                            const linked = choice.parent_stocks && pc.id in choice.parent_stocks
                            const ps = choice.parent_stocks?.[pc.id] ?? -1
                            return (
                              <div key={pc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingLeft: 8 }}>
                                <input type="checkbox" checked={linked}
                                  onChange={() => toggleParentLink(layerIdx, choice.id, pc.id)} />
                                <span style={{ fontSize: 12, color: '#555', minWidth: 60 }}>{pc.name || pc.model_name || '?'}</span>
                                {linked && (
                                  <>
                                    <span style={{ fontSize: 11, color: '#888' }}>在庫</span>
                                    <input type="number" value={ps < 0 ? '' : ps} placeholder="∞"
                                      onChange={e => updateParentStock(layerIdx, choice.id, pc.id, e.target.value)}
                                      style={{ ...inp, width: 52, textAlign: 'center' }} />
                                  </>
                                )}
                              </div>
                            )
                          })}
                          {renderPerChoicePricing(layerIdx, 'choices', choice)}
                        </div>
                      ))}
                      <button type="button" onClick={() => update(layers.map((l, i) => i !== layerIdx ? l : { ...l, choices: [] }))}
                        style={{ fontSize: 11, color: '#888', background: 'none', border: '1px dashed #bbb', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', alignSelf: 'flex-start' }}>
                        在庫設定をリセット
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add sub-layer button (between layers or at end) */}
            {layerIdx === layers.length - 1 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: '#bbb', alignSelf: 'center' }}>↓ サブ選択肢を追加</span>
                <button type="button" onClick={() => addLayer('manual')}
                  style={{ fontSize: 11, background: '#e8f0fe', color: '#1a3560', border: '1px solid #c5cae9', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', fontWeight: 700 }}>
                  + 手動
                </button>
                <button type="button" onClick={() => addLayer('models')}
                  style={{ fontSize: 11, background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', fontWeight: 700 }}>
                  + モデル
                </button>
                {allowSlots && !layers.some(l => l.type === 'slots') && (
                  <button type="button" onClick={addSlotsLayer}
                    style={{ fontSize: 11, background: '#e0f7fa', color: '#0097a7', border: '1px solid #b2ebf2', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', fontWeight: 700 }}>
                    + 時間枠
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {layers.length === 0 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '12px 0' }}>
          <button type="button" onClick={() => addLayer('manual')}
            style={{ fontSize: 12, background: '#e8f0fe', color: '#1a3560', border: '1px solid #c5cae9', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}>
            + 手動
          </button>
          <button type="button" onClick={() => addLayer('models')}
            style={{ fontSize: 12, background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}>
            + モデル
          </button>
          {allowSlots && (
            <button type="button" onClick={addSlotsLayer}
              style={{ fontSize: 12, background: '#e0f7fa', color: '#0097a7', border: '1px solid #b2ebf2', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}>
              + 時間枠
            </button>
          )}
        </div>
      )}
    </div>
  )
}
