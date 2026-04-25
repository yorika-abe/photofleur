import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function getModelUser() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.some(r => ['model', 'admin'].includes(r))) return { error: 'Forbidden', status: 403 }
  const { data: model } = await admin.from('models').select('id').eq('user_id', user.id).single()
  if (!model) return { error: 'Model not found', status: 404 }
  return { user, admin, modelId: model.id }
}

export async function GET() {
  const result = await getModelUser()
  if (result.error) return Response.json({ error: result.error }, { status: result.status })
  const { admin, modelId } = result
  const { data } = await admin.from('model_private_info').select('*').eq('model_id', modelId).single()
  return Response.json(data || {})
}

export async function POST(req) {
  const result = await getModelUser()
  if (result.error) return Response.json({ error: result.error }, { status: result.status })
  const { admin, modelId } = result
  const body = await req.json()

  const payload = {
    model_id: modelId,
    real_name: body.real_name || null,
    address: body.address || null,
    station: body.station || null,
    agency: body.agency || null,
    phone: body.phone || null,
    email: body.email || null,
    school_company: body.school_company || null,
    guardian_name: body.guardian_name || null,
    contract_agreed_at: body.contract_agreed_at || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin.from('model_private_info').upsert(payload, { onConflict: 'model_id' })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
