import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { syncBookingSlots } from '@/lib/sync-booking-slots'

async function checkAdmin(admin) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return false
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin')
}

export async function GET(req) {
  const admin = await createSupabaseAdminClient()
  if (!(await checkAdmin(admin))) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = admin
    .from('model_shifts')
    .select('*, models(id, name, image)')
    .order('event_date', { ascending: true })

  const today = new Date().toISOString().split('T')[0]
  if (status === 'ended') {
    query = query.lt('event_date', today)
  } else {
    query = query.gte('event_date', today)
    if (status) query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function PATCH(req) {
  const admin = await createSupabaseAdminClient()
  if (!(await checkAdmin(admin))) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status } = await req.json()

  // 承認時は先にシフト情報を取得してスロット同期
  if (status === 'submitted') {
    const { data: shift } = await admin
      .from('model_shifts')
      .select('model_id, event_date, available_from, available_until, available_slots')
      .eq('id', id)
      .single()
    if (shift) await syncBookingSlots(admin, shift)
  }

  const { error } = await admin.from('model_shifts').update({ status }).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
