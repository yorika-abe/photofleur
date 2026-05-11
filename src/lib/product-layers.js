// Shared utilities for the "layers" option format
// New format: { type: 'layers', layers: [...] }
// Old format: { type: 'groups', groups: [...] } — read-only backward compat

export function genId() {
  return Math.random().toString(36).slice(2, 9)
}

// Get choices for a given layer, filtering by parent/grandparent selection id
export function getLayerChoices(layer, parentSelectionId, grandparentSelectionId) {
  const choices = layer.type === 'models' ? (layer.model_choices || []) : (layer.choices || [])
  if (!parentSelectionId) return choices
  return choices.filter(c => {
    if (grandparentSelectionId && c.nested_stocks?.[parentSelectionId]) {
      return grandparentSelectionId in c.nested_stocks[parentSelectionId]
    }
    return c.parent_stocks && parentSelectionId in c.parent_stocks
  })
}

// Get display stock for a choice
// For layer 0: choice.stock
// For layer 1: choice.parent_stocks[parentChoiceId]
// For layer 2+: choice.nested_stocks[parentId][grandparentId] if available, else parent_stocks[parentId]
export function getChoiceStock(choice, layerIdx, parentChoiceId, grandparentChoiceId) {
  if (layerIdx === 0) return choice.stock ?? -1
  if (grandparentChoiceId && choice.nested_stocks?.[parentChoiceId]) {
    const ns = choice.nested_stocks[parentChoiceId][grandparentChoiceId]
    if (ns !== undefined) return ns
  }
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
      const grandparentId = i >= 2 ? path[i - 2] : null
      if (grandparentId && choice.nested_stocks?.[parentId]) {
        const ns = choice.nested_stocks[parentId][grandparentId]
        if (ns === 0) return false
      } else {
        const ps = choice.parent_stocks?.[parentId]
        if (ps === 0) return false
      }
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
        const grandparentId = i >= 2 ? path[i - 2] : null
        if (grandparentId && c.nested_stocks?.[parentId]?.[grandparentId] != null) {
          const ns = c.nested_stocks[parentId][grandparentId]
          if (ns > 0) {
            return {
              ...c,
              nested_stocks: {
                ...c.nested_stocks,
                [parentId]: { ...c.nested_stocks[parentId], [grandparentId]: ns - 1 },
              },
            }
          }
          return c
        }
        const ps = c.parent_stocks?.[parentId]
        if (ps > 0) return { ...c, parent_stocks: { ...c.parent_stocks, [parentId]: ps - 1 } }
        return c
      }),
    }
  })
  return { ...options, layers }
}

// Get the price override for the leaf choice in a selection path.
// Checks nested_prices[parentId][grandparentId] first, then parent_prices[parentId], then choice.price.
export function getLeafChoicePrice(options, path) {
  if (!options || options.type !== 'layers' || !path?.length) return null
  const layers = options.layers || []
  const leafIdx = path.length - 1
  const layer = layers[leafIdx]
  if (!layer) return null
  const choices = layer.type === 'models' ? (layer.model_choices || []) : (layer.choices || [])
  const choice = choices.find(c => c.id === path[leafIdx])
  if (!choice) return null
  if (leafIdx >= 2 && choice.nested_prices) {
    const parentId = path[leafIdx - 1]
    const grandparentId = path[leafIdx - 2]
    const np = choice.nested_prices?.[parentId]?.[grandparentId]
    if (np != null) return np
  }
  if (leafIdx > 0 && choice.parent_prices) {
    const parentChoiceId = path[leafIdx - 1]
    if (parentChoiceId != null && choice.parent_prices[parentChoiceId] != null) {
      return choice.parent_prices[parentChoiceId]
    }
  }
  return choice.price != null ? choice.price : null
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
