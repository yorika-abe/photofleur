'use client'
import { useCart } from '@/context/CartContext'
import { useRouter } from 'next/navigation'

export default function CartButton() {
  const { items, removeItem, ready, isCartOpen, closeCart } = useCart()
  const router = useRouter()

  if (!ready || !isCartOpen) return null

  const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)

  return (
    <div onClick={closeCart} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 400,
        background: '#fff', display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1a3560' }}>カート ({items.length}件)</span>
          <button onClick={closeCart} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {items.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: '24px 0' }}>カートは空です</p>
          ) : items.map(item => (
            <div key={item.cartId} style={{ display: 'flex', gap: 12, padding: '12px', background: '#f8f8f8', borderRadius: 10, marginBottom: 10 }}>
              {item.image && <img src={item.image} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: item.type === 'slot' ? '#1a3560' : item.type === 'goods' ? '#2e7d32' : '#5bbfd6' }}>
                  {item.type === 'slot' ? '通常予約' : item.type === 'goods' ? 'グッズ' : '予約商品'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#222', marginBottom: 2 }}>{item.name || item.title}</div>
                {item._label && <div style={{ fontSize: 12, color: '#666' }}>{item._label}</div>}
                {item.slotLabel && <div style={{ fontSize: 12, color: '#666' }}>🕐 {item.slotLabel}</div>}
                {item.eventDate && <div style={{ fontSize: 12, color: '#666' }}>📅 {item.eventDate}</div>}
                {item.eventLocation && <div style={{ fontSize: 12, color: '#666' }}>📍 {item.eventLocation}</div>}
                {item.selectionSummary && <div style={{ fontSize: 12, color: '#666' }}>{item.selectionSummary}</div>}
                {(item.quantity || 1) > 1 && <div style={{ fontSize: 12, color: '#666' }}>数量: {item.quantity}</div>}
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3560', marginTop: 4 }}>
                  ¥{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                </div>
              </div>
              <button onClick={() => removeItem(item.cartId)} style={{ background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', fontSize: 20, alignSelf: 'flex-start', flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#555' }}>合計</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#1a3560' }}>¥{total.toLocaleString()}</span>
          </div>
          <button onClick={() => { closeCart(); router.push('/cart-checkout') }}
            style={{ width: '100%', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            まとめてチェックアウト →
          </button>
        </div>
      </div>
    </div>
  )
}
