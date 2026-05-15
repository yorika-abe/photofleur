import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await admin
    .from('email_templates')
    .select('id, name, subject, updated_at')
    .like('id', 'nl-%')
    .order('updated_at', { ascending: false })

  return Response.json({ templates: data || [] })
}

export async function POST(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { name, subject, rows_json, header_json, footer } = await req.json()
  if (!name?.trim()) return Response.json({ error: 'name is required' }, { status: 400 })

  const id = `nl-${Date.now()}`
  const { error } = await admin.from('email_templates').insert({
    id,
    name: name.trim(),
    subject: subject || '',
    rows_json: rows_json || [],
    header_json: header_json || {},
    footer: footer || '',
    updated_at: new Date().toISOString(),
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, id })
}
