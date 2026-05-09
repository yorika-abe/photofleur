import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const { data } = await admin.from('representatives').select('id, photo, role, name, message, model_id').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
  return Response.json(data || [])
}
