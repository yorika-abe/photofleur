'use client'
import { useState } from 'react'

// type: 'event_product' | 'private' | 'goods'
// item: booking/order object with .id, .payment_method, .square_payment_id, .final_price (or .price)
export default function CancelModal({ item, type, customerName, price, onClose, onDone }) {
  const [cancelReason, setCancelReason] = useState('')
  const [executing, setExecuting] = useState(false)
  const hasCard = item.payment_method === 'card' && item.square_payment_id
  const [refundType, setRefundType] = useState(hasCard ? 'full' : 'none')
  const [customAmount, setCustomAmount] = useState(String(price || 0))
  const [result, setResult] = useState(null)

  const refundAmount = refundType === 'full' ? (price || 0)
    : refundType === 'custom' ? (Number(customAmount) || 0)
    : 0

  const bodyKey = type === 'event_product' ? 'event_product_booking_id'
    : type === 'private' ? 'private_booking_id'
    : 'goods_order_id'

  async function execute() {
    setExecuting(true)
    const res = await fetch('/api/admin/cancel-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [bodyKey]: item.id, refund_amount: refundAmount, cancel_reason: cancelReason }),
    })
    const data = await res.json()
    setExecuting(false)
    if (!res.ok) { setResult({ error: data.error || 'エラーが発生しました' }); return }

    let msg = data.mail_ok ? 'キャンセルメールを送信しました。' : '⚠️ メール送信に失敗しました（キャンセル自体は完了）。'
    if (refundAmount > 0) {
      if (data.refund_ok) msg += `　Square返金（¥${refundAmount.toLocaleString()}）が完了しました。`
      else if (data.refund_error) msg += `　※返金エラー: ${data.refund_error}`
    }
    setResult({ msg })
    onDone?.()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 440, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#2f2244', marginBottom: 6 }}>予約キャンセル</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>{customerName} 様　決済額：¥{(price || 0).toLocaleString()}</div>

        {result ? (
          <>
            <div style={{ fontSize: 14, color: result.error ? '#c62828' : '#1b5e20', background: result.error ? '#ffebee' : '#e8f5e9', borderRadius: 10, padding: '12px 16px', marginBottom: 20, lineHeight: 1.7 }}>
              {result.error || result.msg}
            </div>
            <button onClick={onClose} style={{ width: '100%', padding: '10px 0', border: 'none', borderRadius: 10, background: '#2f2244', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              閉じる
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2f2244', marginBottom: 6 }}>キャンセル理由（メールに記載されます）</label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3}
                placeholder="例：イベント中止のため、定員超過のため、など"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 10, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            {hasCard && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  {[
                    { key: 'none', label: '返金なし（キャンセルメールのみ）' },
                    { key: 'full', label: `全額返金　¥${(price || 0).toLocaleString()}` },
                    { key: 'custom', label: '金額を指定して返金' },
                  ].map(opt => (
                    <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer', padding: '10px 14px', borderRadius: 10, border: `2px solid ${refundType === opt.key ? '#2f2244' : '#e5e5e5'}`, background: refundType === opt.key ? '#f0eeff' : '#fafafa' }}>
                      <input type="radio" checked={refundType === opt.key} onChange={() => setRefundType(opt.key)} style={{ accentColor: '#2f2244' }} />
                      {opt.label}
                    </label>
                  ))}
                  {refundType === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8 }}>
                      <span style={{ fontSize: 14 }}>¥</span>
                      <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)}
                        style={{ width: 120, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14 }} min={0} max={price} />
                    </div>
                  )}
                </div>
                {refundType !== 'none' && (
                  <div style={{ fontSize: 12, color: '#1565c0', background: '#e3f2fd', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                    ⚠️ Square返金：¥{refundAmount.toLocaleString()} を実行します
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #ddd', borderRadius: 10, background: '#f5f5f5', color: '#555', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                戻る
              </button>
              <button onClick={execute} disabled={executing}
                style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, background: executing ? '#ccc' : '#c62828', color: '#fff', fontWeight: 700, fontSize: 14, cursor: executing ? 'not-allowed' : 'pointer' }}>
                {executing ? '処理中...' : 'キャンセル実行'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
