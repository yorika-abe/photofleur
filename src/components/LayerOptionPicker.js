'use client'

import { getLayerChoices, getChoiceStock } from '@/lib/product-layers'

// props:
//   options: product.options ({ type:'layers', layers:[...] })
//   eventModels: array of {id, name, image} (for event context)
//   slotLabels: array of slot label strings (for event context)
//   value: array of selected choice ids (one per layer), length = number of completed selections
//   onChange: (newPath: string[]) => void
export default function LayerOptionPicker({ options, eventModels = [], slotLabels = [], value = [], onChange }) {
  if (!options || options.type !== 'layers') return null
  const layers = options.layers || []
  if (layers.length === 0) return null

  function select(layerIdx, choiceId) {
    const newPath = [...value.slice(0, layerIdx), choiceId]
    onChange(newPath)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {layers.map((layer, layerIdx) => {
        const parentId = layerIdx > 0 ? value[layerIdx - 1] : null
        if (layerIdx > 0 && !parentId) return null

        const choices = layer.type === 'slots'
          ? ((layer.choices || []).length > 0
            ? getLayerChoices(layer, parentId)
            : slotLabels.map((sl, si) => ({ id: `slot_${si}`, name: sl, stock: -1 })))
          : getLayerChoices(layer, parentId)

        const selectedId = value[layerIdx]
        const isMultiple = layer.multiple === true

        return (
          <div key={layer.id}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a3560', marginBottom: 8 }}>
              {layer.type === 'models' ? '👤 ' : layer.type === 'slots' ? '📅 ' : ''}
              {layer.name || (layer.type === 'models' ? 'モデルを選択' : layer.type === 'slots' ? '時間枠を選択' : '選択してください')}
              {isMultiple ? '（複数可）' : ''}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {choices.map(choice => {
                const stock = getChoiceStock(choice, layerIdx, parentId)
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
                      <img src={model.image} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
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
