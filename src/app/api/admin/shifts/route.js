import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { syncBookingSlots } from '@/lib/sync-booking-slots'
import { sendLineMessage } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

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

  const { data: shift } = await admin
    .from('model_shifts')
    .select('model_id, event_date, available_from, available_until, available_slots')
    .eq('id', id)
    .single()

  if (status === 'submitted' && shift) await syncBookingSlots(admin, shift)

  const { error } = await admin.from('model_shifts').update({ status }).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  if ((status === 'submitted' || status === 'rejected') && shift) {
    const { data: model } = await admin.from('models').select('line_id').eq('id', shift.model_id).maybeSingle()
    if (model?.line_id) {
      const templateKey = status === 'submitted' ? 'shift_change_approved' : 'shift_change_rejected'
      const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', templateKey).maybeSingle()
      const template = tmplRow?.body || DEFAULTS[templateKey]
      const [, m, d] = (shift.event_date || '').split('-').map(Number)
      const dateStr = `${m}月${d}日`
      const message = template.replace(/{{date}}/g, dateStr)
      sendLineMessage(model.line_id, message).catch(err => console.error('LINE送信エラー:', err))
    }
  }

  return Response.json({ ok: true })
}
