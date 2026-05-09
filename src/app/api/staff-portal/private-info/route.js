import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function getStaffUser() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role, name').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.some(r => ['staff', 'admin'].includes(r))) return { error: 'Forbidden', status: 403 }
  return { user, admin, userName: profile?.name || '' }
}

export async function GET() {
  const result = await getStaffUser()
  if (result.error) return Response.json({ error: result.error }, { status: result.status })
  const { admin, user } = result
  const { data } = await admin.from('staff_private_info').select('*').eq('user_id', user.id).maybeSingle()
  return Response.json(data || {})
}

export async function POST(req) {
  const result = await getStaffUser()
  if (result.error) return Response.json({ error: result.error }, { status: result.status })
  const { admin, user } = result
  const body = await req.json()

  // guide page saves only profile_photo / display_name — do a targeted update
  if ('profile_photo' in body || 'display_name' in body) {
    const fields = { updated_at: new Date().toISOString() }
    if ('profile_photo' in body) fields.profile_photo = body.profile_photo || null
    if ('display_name' in body) fields.display_name = body.display_name || null
    const { error } = await admin.from('staff_private_info').update(fields).eq('user_id', user.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  if (body.pending_changes) {
    const { error } = await admin.from('staff_private_info')
      .update({ pending_changes: body.pending_changes, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  const payload = {
    user_id: user.id,
    real_name: body.real_name || null,
    phone: body.phone || null,
    email: body.email || null,
    address: body.address || null,
    station: body.station || null,
    bank_name: body.bank_name || null,
    branch_name: body.branch_name || null,
    account_type: body.account_type || null,
    account_number: body.account_number || null,
    account_holder: body.account_holder || null,
    profile_photo: body.profile_photo || null,
    display_name: body.display_name || null,
    updated_at: new Date().toISOString(),
  }
  if (body.contract_agreed_at) payload.contract_agreed_at = body.contract_agreed_at

  const { error } = await admin.from('staff_private_info').upsert(payload, { onConflict: 'user_id' })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
