'use client'
import { useState } from 'react'
import { genId } from '@/lib/product-layers'

export default function LayerOptionBuilder({ layers = [], onChange, models = [], eventModels = [], allowSlots = false, slotLabels = [] }) {
  // Track which choice rows have "詳細に管理する" open
  const [expanded, setExpanded] = useState(new Set())
  // Track which (choiceId:parentId) nested panels are open
  const [nestedExp, setNestedExp] = useState(new Set())

  function toggleExp(id) {
    setExpanded(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  function toggleNestedExp(choiceId, parentId) {
    const k = `${choiceId}:${parentId}`
    setNestedExp(p => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s })
  }

  function update(newLayers) { onChange(newLayers) }

  function addLayer(type) {
    const id = genId()
    const layer = {
      id, type, name: '', multiple: false, no_duplicate: false,
      per_choice_pricing: true, // default ON
      ...(type === 'manual' ? { choices: [] } : {}),
      ...(type === 'models' ? { model_choices: [] } : {}),
    }
    update([...layers, layer])
  }

  function removeLayer(layerIdx) { update(layers.slice(0, layerIdx)) }

  function updateLayer(layerIdx, key, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : { ...l, [key]: val }))
  }

  // ---- Manual choices ----
  function addManualChoice(layerIdx) {
    const id = genId()
    const parentLayer = layerIdx > 0 ? layers[layerIdx - 1] : null
    const parentChoices = parentLayer
      ? (parentLayer.type === 'manual' || parentLayer.type === 'slots' ? parentLayer.choices : parentLayer.model_choices) || []
      : []
    const parent_stocks = layerIdx > 0 ? Object.fromEntries(parentChoices.map(pc => [pc.id, -1])) : undefined
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

  function updateParentPrice(layerIdx, choiceId, parentId, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      choices: (l.choices || []).map(c => c.id !== choiceId ? c : {
        ...c, parent_prices: { ...(c.parent_prices || {}), [parentId]: val === '' ? null : Number(val) },
      }),
    }))
  }

  function addParentCost(layerIdx, choiceId, parentId) {
    const id = genId()
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      choices: (l.choices || []).map(c => {
        if (c.id !== choiceId) return c
        const existing = c.parent_costs?.[parentId] || []
        return { ...c, parent_costs: { ...(c.parent_costs || {}), [parentId]: [...existing, { id, name: '', amount: 0, per_unit: true }] } }
      }),
    }))
  }

  function updateParentCost(layerIdx, choiceId, parentId, itemId, field, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      choices: (l.choices || []).map(c => {
        if (c.id !== choiceId) return c
        const items = (c.parent_costs?.[parentId] || []).map(item => item.id !== itemId ? item : { ...item, [field]: val })
        return { ...c, parent_costs: { ...(c.parent_costs || {}), [parentId]: items } }
      }),
    }))
  }

  function removeParentCost(layerIdx, choiceId, parentId, itemId) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      choices: (l.choices || []).map(c => {
        if (c.id !== choiceId) return c
        return { ...c, parent_costs: { ...(c.parent_costs || {}), [parentId]: (c.parent_costs?.[parentId] || []).filter(item => item.id !== itemId) } }
      }),
    }))
  }

  // Nested (grandparent) stock/price for manual choices at layer 2+
  function toggleNestedLink(layerIdx, choiceId, parentId, grandparentId) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      choices: (l.choices || []).map(c => {
        if (c.id !== choiceId) return c
        const ns = { ...(c.nested_stocks || {}) }
        const parentNs = { ...(ns[parentId] || {}) }
        if (grandparentId in parentNs) delete parentNs[grandparentId]
        else parentNs[grandparentId] = -1
        return { ...c, nested_stocks: { ...ns, [parentId]: parentNs } }
      }),
    }))
  }

  function updateNestedStock(layerIdx, choiceId, parentId, grandparentId, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      choices: (l.choices || []).map(c => {
        if (c.id !== choiceId) return c
        const ns = { ...(c.nested_stocks || {}) }
        ns[parentId] = { ...(ns[parentId] || {}), [grandparentId]: val === '' ? -1 : Number(val) }
        return { ...c, nested_stocks: ns }
      }),
    }))
  }

  function updateNestedPrice(layerIdx, choiceId, parentId, grandparentId, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      choices: (l.choices || []).map(c => {
        if (c.id !== choiceId) return c
        const np = { ...(c.nested_prices || {}) }
        np[parentId] = { ...(np[parentId] || {}), [grandparentId]: val === '' ? null : Number(val) }
        return { ...c, nested_prices: np }
      }),
    }))
  }

  // ---- Model choices ----
  function toggleModel(layerIdx, model) {
    const layerState = layers[layerIdx]
    const exists = (layerState?.model_choices || []).some(mc => mc.model_id === model.id)
    const parentLayer = layerIdx > 0 ? layers[layerIdx - 1] : null
    const parentChoices = parentLayer
      ? (parentLayer.type === 'manual' || parentLayer.type === 'slots' ? parentLayer.choices : parentLayer.model_choices) || []
      : []
    update(layers.map((l, i) => {
      if (i !== layerIdx) return l
      if (exists) return { ...l, model_choices: l.model_choices.filter(mc => mc.model_id !== model.id) }
      const id = genId()
      const parent_stocks = layerIdx > 0 ? Object.fromEntries(parentChoices.map(pc => [pc.id, -1])) : undefined
      return { ...l, model_choices: [...(l.model_choices || []), { id, model_id: model.id, model_name: model.name, stock: -1, ...(parent_stocks ? { parent_stocks } : {}) }] }
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
    update(layers.map((l, i) => i !== layerIdx ? l : { ...l, model_choices: [...(l.model_choices || []), ...toAdd] }))
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

  function updateModelParentPrice(layerIdx, mcId, parentId, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      model_choices: (l.model_choices || []).map(mc => mc.id !== mcId ? mc : {
        ...mc, parent_prices: { ...(mc.parent_prices || {}), [parentId]: val === '' ? null : Number(val) },
      }),
    }))
  }

  function addModelParentCost(layerIdx, mcId, parentId) {
    const id = genId()
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      model_choices: (l.model_choices || []).map(mc => {
        if (mc.id !== mcId) return mc
        const existing = mc.parent_costs?.[parentId] || []
        return { ...mc, parent_costs: { ...(mc.parent_costs || {}), [parentId]: [...existing, { id, name: '', amount: 0, per_unit: true }] } }
      }),
    }))
  }

  function updateModelParentCost(layerIdx, mcId, parentId, itemId, field, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      model_choices: (l.model_choices || []).map(mc => {
        if (mc.id !== mcId) return mc
        const items = (mc.parent_costs?.[parentId] || []).map(item => item.id !== itemId ? item : { ...item, [field]: val })
        return { ...mc, parent_costs: { ...(mc.parent_costs || {}), [parentId]: items } }
      }),
    }))
  }

  function removeModelParentCost(layerIdx, mcId, parentId, itemId) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      model_choices: (l.model_choices || []).map(mc => {
        if (mc.id !== mcId) return mc
        return { ...mc, parent_costs: { ...(mc.parent_costs || {}), [parentId]: (mc.parent_costs?.[parentId] || []).filter(item => item.id !== itemId) } }
      }),
    }))
  }

  // Nested (grandparent) stock/price for model choices at layer 2+
  function toggleModelNestedLink(layerIdx, mcId, parentId, grandparentId) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      model_choices: (l.model_choices || []).map(mc => {
        if (mc.id !== mcId) return mc
        const ns = { ...(mc.nested_stocks || {}) }
        const parentNs = { ...(ns[parentId] || {}) }
        if (grandparentId in parentNs) delete parentNs[grandparentId]
        else parentNs[grandparentId] = -1
        return { ...mc, nested_stocks: { ...ns, [parentId]: parentNs } }
      }),
    }))
  }

  function updateModelNestedStock(layerIdx, mcId, parentId, grandparentId, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      model_choices: (l.model_choices || []).map(mc => {
        if (mc.id !== mcId) return mc
        const ns = { ...(mc.nested_stocks || {}) }
        ns[parentId] = { ...(ns[parentId] || {}), [grandparentId]: val === '' ? -1 : Number(val) }
        return { ...mc, nested_stocks: ns }
      }),
    }))
  }

  function updateModelNestedPrice(layerIdx, mcId, parentId, grandparentId, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      model_choices: (l.model_choices || []).map(mc => {
        if (mc.id !== mcId) return mc
        const np = { ...(mc.nested_prices || {}) }
        np[parentId] = { ...(np[parentId] || {}), [grandparentId]: val === '' ? null : Number(val) }
        return { ...mc, nested_prices: np }
      }),
    }))
  }

  // ---- Slots ----
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

  // ---- Per-choice pricing (leaf layer, no parent) ----
  function updateChoicePrice(layerIdx, choiceKey, choiceId, val) {
    update(layers.map((l, i) => i !== layerIdx ? l : {
      ...l,
      [choiceKey]: (l[choiceKey] || []).map(c => c.id !== choiceId ? c : { ...c, price: val === '' ? null : Number(val) }),
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

  // Render per-choice pricing block (for leaf layer, no parent context)
  function renderBaseChoicePricing(layerIdx, choiceKey, choice) {
    const layer = layers[layerIdx]
    if (layerIdx !== layers.length - 1 || !layer.per_choice_pricing) return null
    return (
      <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>料金¥</span>
          <input type="number" value={choice.price ?? ''} placeholder="デフォルト使用"
            onChange={e => updateChoicePrice(layerIdx, choiceKey, choice.id, e.target.value)}
            style={{ ...inp, width: 100, textAlign: 'right' }} />
          <span style={{ fontSize: 10, color: '#aaa' }}>空欄=商品デフォルト価格</span>
        </div>
        <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 4 }}>販管費</div>
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
    )
  }

  // Render cost items for a parent-linked context
  function renderParentCostItems(layerIdx, choiceId, parentId, costKey, isModel) {
    const layer = layers[layerIdx]
    if (layerIdx !== layers.length - 1 || !layer.per_choice_pricing) return null
    const choices = isModel ? (layer.model_choices || []) : (layer.choices || [])
    const choice = choices.find(c => c.id === choiceId)
    if (!choice) return null
    const costs = choice[costKey]?.[parentId] || []
    const addFn = isModel ? addModelParentCost : addParentCost
    const updateFn = isModel ? updateModelParentCost : updateParentCost
    const removeFn = isModel ? removeModelParentCost : removeParentCost

    return (
      <div style={{ paddingLeft: 16, marginTop: 4 }}>
        {costs.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, flexWrap: 'wrap' }}>
            <input value={item.name} placeholder="項目名"
              onChange={e => updateFn(layerIdx, choiceId, parentId, item.id, 'name', e.target.value)}
              style={{ ...inp, width: 100 }} />
            <span style={{ fontSize: 11 }}>¥</span>
            <input type="number" value={item.amount}
              onChange={e => updateFn(layerIdx, choiceId, parentId, item.id, 'amount', Number(e.target.value))}
              style={{ ...inp, width: 72, textAlign: 'right' }} />
            <select value={item.per_unit ? 'unit' : 'fixed'}
              onChange={e => updateFn(layerIdx, choiceId, parentId, item.id, 'per_unit', e.target.value === 'unit')}
              style={{ ...inp, fontSize: 11, padding: '6px 4px' }}>
              <option value="unit">1個あたり</option>
              <option value="fixed">まとめて</option>
            </select>
            <button type="button" onClick={() => removeFn(layerIdx, choiceId, parentId, item.id)}
              style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 16, cursor: 'pointer', padding: '0 2px' }}>×</button>
          </div>
        ))}
        <button type="button" onClick={() => addFn(layerIdx, choiceId, parentId)}
          style={{ fontSize: 11, color: '#888', background: 'none', border: '1px dashed #ddd', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', marginTop: 2 }}>
          + 販管費を追加
        </button>
      </div>
    )
  }

  // Render the nested grandparent management panel
  function renderGrandparentPanel(layerIdx, choiceId, parentId, isManual, grandparentChoices, isLeaf, perPricingOn, choice) {
    const nestedKey = `${choiceId}:${parentId}`
    const isOpen = nestedExp.has(nestedKey)
    return (
      <div style={{ marginTop: 4, paddingLeft: 16 }}>
        <button type="button" onClick={() => toggleNestedExp(choiceId, parentId)}
          style={{ fontSize: 11, color: '#f4a0be', background: 'none', border: '1px solid #f4c8dc', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>
          {isOpen ? '▼ 閉じる' : '▶ 詳細に管理する'}
        </button>
        {isOpen && (
          <div style={{ marginTop: 6, paddingLeft: 8, borderLeft: '2px solid #f4c8dc' }}>
            {grandparentChoices.map(gpc => {
              const linked = isManual
                ? (choice.nested_stocks?.[parentId] && gpc.id in (choice.nested_stocks[parentId] || {}))
                : (choice.nested_stocks?.[parentId] && gpc.id in (choice.nested_stocks[parentId] || {}))
              const ns = choice.nested_stocks?.[parentId]?.[gpc.id] ?? -1
              const nestedPrice = choice.nested_prices?.[parentId]?.[gpc.id]
              const toggleFn = isManual ? toggleNestedLink : toggleModelNestedLink
              const updateStockFn = isManual ? updateNestedStock : updateModelNestedStock
              const updatePriceFn = isManual ? updateNestedPrice : updateModelNestedPrice
              return (
                <div key={gpc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <input type="checkbox" checked={!!linked}
                    onChange={() => toggleFn(layerIdx, choiceId, parentId, gpc.id)} />
                  <span style={{ fontSize: 12, color: '#555', fontWeight: 600, minWidth: 60 }}>{gpc.name || gpc.model_name || '?'}</span>
                  {linked && (
                    <>
                      <span style={{ fontSize: 11, color: '#888' }}>在庫</span>
                      <input type="number" value={ns < 0 ? '' : ns} placeholder="∞"
                        onChange={e => updateStockFn(layerIdx, choiceId, parentId, gpc.id, e.target.value)}
                        style={{ ...inp, width: 52, textAlign: 'center' }} />
                      {isLeaf && perPricingOn && (
                        <>
                          <span style={{ fontSize: 11, color: '#888' }}>料金¥</span>
                          <input type="number" value={nestedPrice ?? ''} placeholder="デフォルト"
                            onChange={e => updatePriceFn(layerIdx, choiceId, parentId, gpc.id, e.target.value)}
                            style={{ ...inp, width: 90, textAlign: 'right' }} />
                        </>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Render the "詳細に管理する" expanded section for a choice (layer 1+)
  function renderDetailPanel(layerIdx, choiceId, choice, parentChoices, grandparentChoices, isLeaf, perPricingOn, isManual) {
    const isOpen = expanded.has(choiceId)
    return (
      <div style={{ marginTop: 6 }}>
        <button type="button" onClick={() => toggleExp(choiceId)}
          style={{ fontSize: 11, color: '#5bbfd6', background: 'none', border: '1px solid #b0e0ee', borderRadius: 5, padding: '2px 10px', cursor: 'pointer', fontWeight: 600 }}>
          {isOpen ? '▼ 閉じる' : '▶ 詳細に管理する'}
        </button>
        {isOpen && (
          <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #b0e0ee' }}>
            {parentChoices.map(pc => {
              const linked = isManual
                ? (choice.parent_stocks && pc.id in choice.parent_stocks)
                : (choice.parent_stocks && pc.id in choice.parent_stocks)
              const ps = choice.parent_stocks?.[pc.id] ?? -1
              const parentPrice = isManual ? choice.parent_prices?.[pc.id] : choice.parent_prices?.[pc.id]
              return (
                <div key={pc.id} style={{ marginBottom: 8, padding: '6px 8px', background: '#f8f9ff', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <input type="checkbox" checked={!!linked}
                      onChange={() => isManual ? toggleParentLink(layerIdx, choiceId, pc.id) : toggleModelParentLink(layerIdx, choiceId, pc.id)} />
                    <span style={{ fontSize: 12, color: '#444', fontWeight: 600, minWidth: 60 }}>{pc.name || pc.model_name || '?'}</span>
                    {linked && grandparentChoices.length === 0 && (
                      <>
                        <span style={{ fontSize: 11, color: '#888' }}>在庫</span>
                        <input type="number" value={ps < 0 ? '' : ps} placeholder="∞"
                          onChange={e => isManual ? updateParentStock(layerIdx, choiceId, pc.id, e.target.value) : updateModelParentStock(layerIdx, choiceId, pc.id, e.target.value)}
                          style={{ ...inp, width: 52, textAlign: 'center' }} />
                        {isLeaf && perPricingOn && (
                          <>
                            <span style={{ fontSize: 11, color: '#888' }}>料金¥</span>
                            <input type="number" value={parentPrice ?? ''} placeholder="デフォルト"
                              onChange={e => isManual ? updateParentPrice(layerIdx, choiceId, pc.id, e.target.value) : updateModelParentPrice(layerIdx, choiceId, pc.id, e.target.value)}
                              style={{ ...inp, width: 90, textAlign: 'right' }} />
                          </>
                        )}
                      </>
                    )}
                  </div>
                  {linked && isLeaf && perPricingOn && grandparentChoices.length === 0 && renderParentCostItems(layerIdx, choiceId, pc.id, isManual ? 'parent_costs' : 'parent_costs', !isManual)}
                  {linked && grandparentChoices.length > 0 && renderGrandparentPanel(layerIdx, choiceId, pc.id, isManual, grandparentChoices, isLeaf, perPricingOn, choice)}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {layers.map((layer, layerIdx) => {
        const isLeaf = layerIdx === layers.length - 1
        const parentLayer = layerIdx > 0 ? layers[layerIdx - 1] : null
        const grandparentLayer = layerIdx > 1 ? layers[layerIdx - 2] : null
        const parentChoices = parentLayer
          ? (parentLayer.type === 'manual' || parentLayer.type === 'slots' ? parentLayer.choices : parentLayer.model_choices) || []
          : []
        const grandparentChoices = grandparentLayer
          ? (grandparentLayer.type === 'manual' || grandparentLayer.type === 'slots' ? grandparentLayer.choices : grandparentLayer.model_choices) || []
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
                      <input type="checkbox" checked={layer.per_choice_pricing ?? true}
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
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                        {layerIdx > 0 && renderDetailPanel(layerIdx, choice.id, choice, parentChoices, grandparentChoices, isLeaf, layer.per_choice_pricing ?? true, true)}
                        {layerIdx === 0 && renderBaseChoicePricing(layerIdx, 'choices', choice)}
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
                          <div style={{ fontWeight: 700, fontSize: 12, color: '#2e7d32', marginBottom: layerIdx === 0 ? 6 : 0 }}>{mc.model_name}</div>
                          {layerIdx === 0 ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: '#888' }}>在庫</span>
                                <input type="number" value={mc.stock < 0 ? '' : mc.stock} placeholder="∞"
                                  onChange={e => updateModelChoice(layerIdx, mc.id, 'stock', e.target.value === '' ? -1 : Number(e.target.value))}
                                  style={{ ...inp, width: 58, textAlign: 'center' }} />
                              </div>
                              {renderBaseChoicePricing(layerIdx, 'model_choices', mc)}
                            </>
                          ) : renderDetailPanel(layerIdx, mc.id, mc, parentChoices, grandparentChoices, isLeaf, layer.per_choice_pricing ?? true, false)}
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
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                          {layerIdx > 0 && renderDetailPanel(layerIdx, choice.id, choice, parentChoices, grandparentChoices, isLeaf, layer.per_choice_pricing ?? true, true)}
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
