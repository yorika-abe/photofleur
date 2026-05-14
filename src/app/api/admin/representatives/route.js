import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const { data, error } = await admin.from('representatives').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data: maxRow } = await admin.from('representatives').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const sort_order = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await admin.from('representatives').insert({
    photo: body.photo || '',
    role: body.role || '',
    name: body.name || '',
    message: body.message || '',
    model_id: body.model_id || null,
    sort_order,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
