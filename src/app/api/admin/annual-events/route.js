import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const [{ data: events }, { data: models }] = await Promise.all([
    admin.from('annual_events').select('*').order('month').order('day'),
    admin.from('models').select('id, name, birthday, pending_data').order('birthday'),
  ])
  const normalizedModels = (models || [])
    .map(m => {
      const bd = m.birthday || m.pending_data?.birthday || null
      return { id: m.id, name: m.name, birthday: bd ? bd.replace(/\//g, '-') : null }
    })
    .filter(m => m.birthday)
  return Response.json({ events: events || [], models: normalizedModels })
}

export async function POST(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { month, day, title, notify_model_group, notify_camera } = await req.json()
  const { data, error } = await admin
    .from('annual_events')
    .insert({ month, day, title, notify_model_group, notify_camera })
    .select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ event: data })
}

export async function PUT(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await req.json()
  const { error } = await admin.from('annual_events').update(updates).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await admin.from('annual_events').delete().eq('id', id)
  return Response.json({ ok: true })
}
