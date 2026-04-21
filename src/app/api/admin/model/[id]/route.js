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
  const { error } = await supabase.from('models').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function POST(req, { params }) {
  const { id } = await params
  const { action, email } = await req.json()
  const supabase = await createSupabaseAdminClient()

  if (action === 'approve') {
    await supabase.from('models').update({ status: 'active' }).eq('id', id)
    return Response.json({ ok: true })
  }

  if (action === 'reject') {
    await supabase.from('models').update({ status: 'inactive' }).eq('id', id)
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
