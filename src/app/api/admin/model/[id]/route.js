import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req, { params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const { data, error } = await supabase.from('models').select('*').eq('id', id).single()
  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}

export async function PUT(req, { params }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createSupabaseAdminClient()

  // 現在の画像URLを取得して、更新・削除されたものをストレージから消す
  const { data: current } = await supabase.from('models').select('image, portfolio_images').eq('id', id).single()
  if (current) {
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`
    const toDelete = []

    // プロフィール画像が変わった場合
    if (current.image && current.image !== body.image && current.image.startsWith(base)) {
      toDelete.push(current.image.replace(base, ''))
    }

    // ポートフォリオから削除された画像
    const oldPf = current.portfolio_images || []
    const newPf = body.portfolio_images || []
    for (const url of oldPf) {
      if (!newPf.includes(url) && url.startsWith(base)) {
        toDelete.push(url.replace(base, ''))
      }
    }

    if (toDelete.length > 0) {
      await supabase.storage.from('images').remove(toDelete)
    }
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
    const { data: model } = await supabase.from('models').select('pending_data').eq('id', id).single()
    const updates = { status: 'active', pending_data: null }
    if (model?.pending_data) Object.assign(updates, model.pending_data)
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
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`

  const { data: model } = await supabase.from('models').select('image, portfolio_images').eq('id', id).single()
  if (model) {
    const toDelete = []
    if (model.image?.startsWith(base)) toDelete.push(model.image.replace(base, ''))
    for (const url of model.portfolio_images || []) {
      if (url?.startsWith(base)) toDelete.push(url.replace(base, ''))
    }
    if (toDelete.length > 0) await supabase.storage.from('images').remove(toDelete)
  }

  await supabase.from('models').delete().eq('id', id)
  return Response.json({ ok: true })
}
