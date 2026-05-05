import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const now = new Date().toISOString()
  const { data } = await admin
    .from('goods')
    .select('id, title, description, price, image, payment_method, stock, options, sale_start, sale_end')
    .eq('is_active', true)
    .or(`sale_start.is.null,sale_start.lte.${now}`)
    .or(`sale_end.is.null,sale_end.gte.${now}`)
    .order('created_at', { ascending: false })
  return Response.json({ goods: data || [] })
}
