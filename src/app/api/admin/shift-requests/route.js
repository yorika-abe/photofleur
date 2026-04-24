import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineGroupMessage, buildShiftOpenMessage } from '@/lib/line'

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
  const { request_date, dates, event_type, notes, deadline, notify } = body

  // 複数日まとめて登録
  const targetDates = dates && dates.length > 0 ? dates : [request_date]

  // 既存の日付を取得して重複を除外
  const { data: existing } = await admin
    .from('shift_request_dates')
    .select('request_date')
    .in('request_date', targetDates)
  const existingSet = new Set((existing || []).map(r => r.request_date))
  const newDates = targetDates.filter(d => !existingSet.has(d))

  if (newDates.length === 0) return Response.json([])

  const rows = newDates.map(d => ({
    request_date: d,
    event_type: event_type || 'both',
    notes: notes || null,
    deadline: deadline || null,
  }))

  const { data, error } = await admin.from('shift_request_dates').insert(rows).select()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (notify) {
    await sendLineGroupMessage(buildShiftOpenMessage()).catch(() => {})
  }

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
