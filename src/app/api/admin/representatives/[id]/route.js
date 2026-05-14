import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { deleteFromR2 } from '@/lib/r2'
import { requireAdmin } from '@/lib/auth'

export async function GET(_req, { params }) {
  const { id } = await params
  const admin = await createSupabaseAdminClient()
  const { data, error } = await admin.from('representatives').select('*').eq('id', id).single()
  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}

export async function PUT(req, { params }) {
  const { id } = await params
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // 画像差し替え時に旧画像を削除
  if (body.photo !== undefined) {
    const { data: old } = await admin.from('representatives').select('photo').eq('id', id).single()
    if (old?.photo && old.photo !== body.photo) await deleteFromR2([old.photo])
  }

  const { data, error } = await admin.from('representatives').update({
    photo: body.photo ?? '',
    role: body.role ?? '',
    name: body.name ?? '',
    message: body.message ?? '',
    model_id: body.model_id || null,
  }).eq('id', id).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_req, { params }) {
  const { id } = await params
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rep } = await admin.from('representatives').select('photo').eq('id', id).single()
  if (rep?.photo) await deleteFromR2([rep.photo])

  const { error } = await admin.from('representatives').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
