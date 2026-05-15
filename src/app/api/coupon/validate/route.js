import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { code } = await req.json()
  if (!code) return Response.json({ error: 'コードを入力してください' }, { status: 400 })
  if (code.length > 50) return Response.json({ error: '無効なクーポンコードです' }, { status: 400 })

  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('is_active', true)
    .single()

  if (!coupon) return Response.json({ valid: false, error: '無効なクーポンコードです' }, { status: 400 })

  const now = new Date()
  if (coupon.valid_from && new Date(coupon.valid_from) > now)
    return Response.json({ valid: false, error: 'このクーポンはまだ使用できません' }, { status: 400 })
  if (coupon.valid_until && new Date(coupon.valid_until) < now)
    return Response.json({ valid: false, error: 'このクーポンは期限切れです' }, { status: 400 })
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses)
    return Response.json({ valid: false, error: 'このクーポンは使用済みです' }, { status: 400 })

  return Response.json({
    valid: true,
    id: coupon.id,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    description: coupon.description,
  })
}
