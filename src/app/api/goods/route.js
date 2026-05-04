import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const { data } = await admin
    .from('goods')
    .select('id, title, description, price, image, payment_method, stock')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  return Response.json({ goods: data || [] })
}
