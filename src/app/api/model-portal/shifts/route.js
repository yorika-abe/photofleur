import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function getModelUser() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.some(r => ['model', 'admin'].includes(r))) return { error: 'Forbidden' }

  const { data: model } = await admin.from('models').select('id').eq('user_id', user.id).single()
  return { user, admin, model }
}

export async function GET() {
  const { error, admin, model } = await getModelUser()
  if (error) return Response.json({ error }, { status: 401 })
  if (!model) return Response.json([])

  const { data } = await admin
    .from('model_shifts')
    .select('*')
    .eq('model_id', model.id)
    .order('event_date', { ascending: true })

  return Response.json(data || [])
}

export async function POST(req) {
  const { error, admin, model } = await getModelUser()
  if (error) return Response.json({ error }, { status: 401 })
  if (!model) return Response.json({ error: 'モデルアカウントが見つかりません' }, { status: 404 })

  const body = await req.json()
  const { event_date, event_type, available_from, available_until, notes } = body

  // 既存シフトがあれば更新、なければ挿入
  const { data: existing } = await admin
    .from('model_shifts')
    .select('id')
    .eq('model_id', model.id)
    .eq('event_date', event_date)
    .maybeSingle()

  const isAllDay = available_from === '00:00' && available_until === '00:00'
  const payload = {
    model_id: model.id,
    event_date,
    event_type,
    available_from: available_from || '00:00',
    available_until: available_until || '00:00',
    notes: notes || null,
    status: 'submitted',
    available_slots: isAllDay
      ? [{ start: '00:00', end: '00:00', all_day: true }]
      : [{ start: available_from || '00:00', end: available_until || '00:00' }],
  }

  let result
  if (existing) {
    result = await admin.from('model_shifts').update(payload).eq('id', existing.id).select().single()
  } else {
    result = await admin.from('model_shifts').insert(payload).select().single()
  }

  if (result.error) return Response.json({ error: result.error.message }, { status: 500 })
  return Response.json(result.data)
}

export async function DELETE(req) {
  const { error, admin, model } = await getModelUser()
  if (error) return Response.json({ error }, { status: 401 })

  const { id } = await req.json()
  const { error: delError } = await admin
    .from('model_shifts')
    .delete()
    .eq('id', id)
    .eq('model_id', model?.id)

  if (delError) return Response.json({ error: delError.message }, { status: 500 })
  return Response.json({ ok: true })
}
