import { requireAdmin } from '@/lib/auth'

// PATCH: { ids: [uuid, uuid, ...] } in desired order
export async function PATCH(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids)) return Response.json({ error: 'ids required' }, { status: 400 })

  await Promise.all(ids.map((id, index) =>
    admin.from('representatives').update({ sort_order: index }).eq('id', id)
  ))

  return Response.json({ ok: true })
}
