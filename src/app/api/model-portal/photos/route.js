import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const modelId = searchParams.get('model_id')
  if (!modelId) return Response.json([])

  const admin = await createSupabaseAdminClient()
  const { data } = await admin
    .from('contributed_photos')
    .select('*')
    .contains('model_ids', [modelId])
    .order('created_at', { ascending: false })
  return Response.json(data || [])
}
