import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { deleteFromR2 } from '@/lib/r2'

export async function GET(req, { params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const { data, error } = await supabase.from('models').select('*').eq('id', id).single()
  if (error) return Response.json({ error: error.message }, { status: 404 })
  if (data?.user_id) {
    const { data: profile } = await supabase.from('user_profiles').select('email').eq('id', data.user_id).single()
    if (profile?.email) data.linked_email = profile.email
  }
  return Response.json(data)
}

export async function PUT(req, { params }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createSupabaseAdminClient()

  const { data: current } = await supabase.from('models').select('image, portfolio_images').eq('id', id).single()
  if (current) {
    const toDelete = []
    if (current.image && current.image !== body.image) toDelete.push(current.image)
    const oldPf = current.portfolio_images || []
    const newPf = body.portfolio_images || []
    for (const url of oldPf) {
      if (!newPf.includes(url)) toDelete.push(url)
    }
    if (toDelete.length > 0) await deleteFromR2(toDelete)
  }

  const { error } = await supabase.from('models').update(body).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function POST(req, { params }) {
  const { id } = await params
  const { action, email } = await req.json()
  const supabase = await createSupabaseAdminClient()

  if (action === 'approve') {
    const { data: model } = await supabase.from('models').select('*').eq('id', id).single()
    const updates = { status: 'active', pending_data: null }
    if (model?.pending_data) Object.assign(updates, model.pending_data)

    if (model?.pending_data) {
      const toDelete = []
      if (model.image && model.pending_data.image && model.image !== model.pending_data.image)
        toDelete.push(model.image)
      const oldPf = model.portfolio_images || []
      const newPf = model.pending_data.portfolio_images || []
      for (const url of oldPf) {
        if (!newPf.includes(url)) toDelete.push(url)
      }
      if (toDelete.length > 0) await deleteFromR2(toDelete)
    }

    await supabase.from('models').update(updates).eq('id', id)
    return Response.json({ ok: true })
  }

  if (action === 'reject') {
    const { data: current } = await supabase.from('models').select('status').eq('id', id).single()
    const newStatus = current?.status === 'active' ? 'active' : 'inactive'
    await supabase.from('models').update({ status: newStatus, pending_data: null }).eq('id', id)
    return Response.json({ ok: true })
  }

  if (action === 'link_user') {
    const authAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: { users } } = await authAdmin.auth.admin.listUsers()
    const found = users?.find(u => u.email === email)
    if (!found) return Response.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    await supabase.from('models').update({ user_id: found.id }).eq('id', id)
    return Response.json({ ok: true, user_id: found.id })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(_req, { params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()

  const { data: model } = await supabase.from('models').select('image, portfolio_images').eq('id', id).single()
  if (model) {
    const toDelete = []
    if (model.image) toDelete.push(model.image)
    for (const url of model.portfolio_images || []) {
      if (url) toDelete.push(url)
    }
    if (toDelete.length > 0) await deleteFromR2(toDelete)
  }

  await supabase.from('models').delete().eq('id', id)
  return Response.json({ ok: true })
}
