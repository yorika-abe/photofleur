import { requireAdmin } from '@/lib/auth'

export async function POST(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { ids } = await req.json()
  if (!Array.isArray(ids)) return Response.json({ error: 'invalid' }, { status: 400 })
  const updates = ids.map((id, i) => admin.from('models').update({ display_order: i }).eq('id', id))
  await Promise.all(updates)
  return Response.json({ ok: true })
}
