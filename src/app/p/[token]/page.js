import { createSupabaseAdminClient } from '@/lib/supabase-server'
import PrivateProductBookingForm from './BookingForm'

export const dynamic = 'force-dynamic'

export default async function PrivateProductPage({ params }) {
  const { token } = await params
  const admin = await createSupabaseAdminClient()

  const { data: product } = await admin
    .from('private_products')
    .select('*, models(id, name, image)')
    .eq('token', token)
    .single()

  if (!product || !product.is_active) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <p style={{ fontSize: 16 }}>このページは存在しないか、現在受付を停止しています。</p>
        </div>
      </div>
    )
  }

  const PAYMENT_LABELS = { cash: '現金払い当日', card: '事前カード決済', both: '現金 / カード決済' }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>
      {/* 商品情報 */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e5e5', overflow: 'hidden', marginBottom: 24 }}>
        {product.image && (
          <img src={product.image} alt={product.title}
            style={{ width: '100%', height: 240, objectFit: 'cover' }} />
        )}
        <div style={{ padding: '20px 24px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '0 0 8px' }}>{product.title}</h1>
          {product.models && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {product.models.image && (
                <img src={product.models.image} alt={product.models.name}
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <span style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>担当: {product.models.name}</span>
            </div>
          )}
          {product.event_date && (
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
              日程: {product.event_date}{product.time_label ? ` ${product.time_label}` : ''}
            </div>
          )}
          {product.description && (
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: '12px 0' }}>{product.description}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1a3560' }}>¥{product.price.toLocaleString()}</span>
            <span style={{ fontSize: 12, color: '#888', background: '#f5f5f5', borderRadius: 6, padding: '4px 10px' }}>
              {PAYMENT_LABELS[product.payment_method] || ''}
            </span>
          </div>
          {product.stock <= 0 && (
            <div style={{ marginTop: 12, background: '#f3e5f5', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#6a1b9a', fontWeight: 600, textAlign: 'center' }}>
              申込済み
            </div>
          )}
        </div>
      </div>

      {/* 予約フォーム */}
      {product.stock > 0 && (
        <PrivateProductBookingForm
          token={token}
          paymentMethod={product.payment_method}
          price={product.price}
          requireEventDetails={product.require_event_details ?? false}
        />
      )}

      <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 24 }}>PhotoFleur</p>
    </div>
  )
}
