import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin(admin) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return false
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin')
}

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const { data, error } = await admin
    .from('shift_request_dates')
    .select('*')
    .order('request_date', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(req) {
  const admin = await createSupabaseAdminClient()
  if (!(await checkAdmin(admin))) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { request_date, dates, event_type, notes, deadline } = body

  // 複数日まとめて登録
  const rows = (dates && dates.length > 0 ? dates : [request_date]).map(d => ({
    request_date: d,
    event_type: event_type || 'both',
    notes: notes || null,
    deadline: deadline || null,
  }))

  const { data, error } = await admin
    .from('shift_request_dates')
    .upsert(rows, { onConflict: 'request_date', ignoreDuplicates: true })
    .select()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(req) {
  const admin = await createSupabaseAdminClient()
  if (!(await checkAdmin(admin))) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await admin.from('shift_request_dates').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
