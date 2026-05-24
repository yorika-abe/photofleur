import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || []

  const admin = await createSupabaseAdminClient()
  const query = admin.from('models').select('id, name, image, studio_price').eq('status', 'active')
  if (ids.length > 0) query.in('id', ids)

  const { data: models } = await query.order('display_order')
  return Response.json({ models: models || [] })
}
