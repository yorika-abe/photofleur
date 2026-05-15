'use client'

import Image from 'next/image'
import { getLayerChoices, getChoiceStock } from '@/lib/product-layers'

export default function LayerOptionPicker({ options, eventModels = [], slotLabels = [], value = [], onChange }) {
  if (!options || options.type !== 'layers') return null
  const layers = options.layers || []
  if (layers.length === 0) return null

  function select(layerIdx, choiceId) {
    onChange([...value.slice(0, layerIdx), choiceId])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {layers.map((layer, layerIdx) => {
        const parentId = layerIdx > 0 ? value[layerIdx - 1] : null
        const grandparentId = layerIdx > 1 ? value[layerIdx - 2] : null
        if (layerIdx > 0 && !parentId) return null

        const choices = layer.type === 'slots'
          ? ((layer.choices || []).length > 0
            ? getLayerChoices(layer, parentId, grandparentId)
            : slotLabels.map((sl, si) => ({ id: `slot_${si}`, name: sl, stock: -1 })))
          : getLayerChoices(layer, parentId, grandparentId)

        const selectedId = value[layerIdx]

        return (
          <div key={layer.id}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a3560', marginBottom: 8 }}>
              {layer.type === 'models' ? '👤 ' : layer.type === 'slots' ? '📅 ' : ''}
              {layer.name || (layer.type === 'models' ? 'モデルを選択' : layer.type === 'slots' ? '時間枠を選択' : '選択してください')}
              {layer.multiple ? '（複数可）' : ''}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {choices.map(choice => {
                const stock = getChoiceStock(choice, layerIdx, parentId, grandparentId)
                const soldOut = stock === 0
                const isSelected = selectedId === choice.id
                const model = layer.type === 'models' ? eventModels.find(m => m.id === choice.model_id) : null

                return (
                  <button key={choice.id} type="button" disabled={soldOut}
                    onClick={() => !soldOut && select(layerIdx, choice.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: 10,
                      border: `2px solid ${isSelected ? '#1a3560' : soldOut ? '#eee' : '#ddd'}`,
                      background: isSelected ? '#1a3560' : soldOut ? '#f5f5f5' : '#fff',
                      color: isSelected ? '#fff' : soldOut ? '#bbb' : '#333',
                      cursor: soldOut ? 'not-allowed' : 'pointer',
                      fontWeight: isSelected ? 700 : 400, fontSize: 13,
                      opacity: soldOut ? 0.6 : 1,
                    }}>
                    {model?.image && (
                      <Image src={model.image} alt="" width={28} height={28} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                    )}
                    <span>
                      {choice.name || choice.model_name}
                      {soldOut ? ' (売切)' : stock > 0 && stock <= 5 ? ` 残${stock}` : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
