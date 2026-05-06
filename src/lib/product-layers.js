// Shared utilities for the "layers" option format
// New format: { type: 'layers', layers: [...] }
// Old format: { type: 'groups', groups: [...] } — read-only backward compat

export function genId() {
  return Math.random().toString(36).slice(2, 9)
}

// Get choices for a given layer, filtering by parent selection id (layer 2+)
export function getLayerChoices(layer, parentSelectionId) {
  const choices = layer.type === 'models' ? (layer.model_choices || []) : (layer.choices || [])
  if (!parentSelectionId) return choices
  return choices.filter(c => c.parent_stocks && parentSelectionId in c.parent_stocks)
}

// Get display stock for a choice at a given layer index
// For layer 0: choice.stock
// For layer 1+: choice.parent_stocks[parentChoiceId]
export function getChoiceStock(choice, layerIdx, parentChoiceId) {
  if (layerIdx === 0) return choice.stock ?? -1
  return choice.parent_stocks?.[parentChoiceId] ?? -1
}

// Check stock availability for a selection path
// path: array of choice ids, one per layer (layer 0 first)
export function checkLayersStock(options, path) {
  if (!options || options.type !== 'layers') return true
  const layers = options.layers || []
  for (let i = 0; i < path.length; i++) {
    const layer = layers[i]
    if (!layer) continue
    const choices = layer.type === 'models' ? (layer.model_choices || []) : (layer.choices || [])
    const choice = choices.find(c => c.id === path[i])
    if (!choice) return false
    if (i === 0) {
      if (choice.stock === 0) return false
    } else {
      const parentId = path[i - 1]
      const ps = choice.parent_stocks?.[parentId]
      if (ps === 0) return false
    }
  }
  return true
}

// Decrement stock for a selection path. Returns new options object.
export function decrementLayersStock(options, path) {
  if (!options || options.type !== 'layers') return options
  const layers = options.layers.map((layer, i) => {
    const choiceId = path[i]
    if (!choiceId) return layer
    const key = layer.type === 'models' ? 'model_choices' : 'choices'
    return {
      ...layer,
      [key]: (layer[key] || []).map(c => {
        if (c.id !== choiceId) return c
        if (i === 0) {
          return c.stock > 0 ? { ...c, stock: c.stock - 1 } : c
        }
        const parentId = path[i - 1]
        const ps = c.parent_stocks?.[parentId]
        if (ps > 0) return { ...c, parent_stocks: { ...c.parent_stocks, [parentId]: ps - 1 } }
        return c
      }),
    }
  })
  return { ...options, layers }
}

// Build selections summary string from path + layers
export function buildSelectionsLabel(options, path) {
  if (!options || options.type !== 'layers') return ''
  const parts = []
  for (let i = 0; i < path.length; i++) {
    const layer = options.layers[i]
    if (!layer) continue
    const choices = layer.type === 'models' ? (layer.model_choices || []) : (layer.choices || [])
    const choice = choices.find(c => c.id === path[i])
    if (choice) parts.push(choice.name || choice.model_name || '')
  }
  return parts.filter(Boolean).join(' / ')
}
