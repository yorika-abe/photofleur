'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const Ctx = createContext(null)

function isValidCartItem(item) {
  if (!item || typeof item !== 'object') return false
  if (!['slot', 'product', 'goods'].includes(item.type)) return false
  if (item.type === 'slot' && !item.slotId) return false
  if (item.type === 'product' && !item.productId) return false
  if (item.type === 'goods' && !item.goodsId) return false
  if (item.price !== undefined && (typeof item.price !== 'number' || item.price < 0)) return false
  return true
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setItems(JSON.parse(localStorage.getItem('pf-cart') || '[]').filter(isValidCartItem)) } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true)
  }, [])

  function persist(next) {
    setItems(next)
    try { localStorage.setItem('pf-cart', JSON.stringify(next)) } catch {}
  }

  return (
    <Ctx.Provider value={{
      items,
      ready,
      isCartOpen,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      addItem: item => persist([...items, { ...item, cartId: Date.now() + '-' + Math.random().toString(36).slice(2) }]),
      removeItem: id => persist(items.filter(i => i.cartId !== id)),
      clearCart: () => persist([]),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useCart = () => useContext(Ctx)
