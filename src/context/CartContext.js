'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const Ctx = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem('pf-cart') || '[]')) } catch {}
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
      addItem: item => persist([...items, { ...item, cartId: Date.now() + '-' + Math.random().toString(36).slice(2) }]),
      removeItem: id => persist(items.filter(i => i.cartId !== id)),
      clearCart: () => persist([]),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useCart = () => useContext(Ctx)
