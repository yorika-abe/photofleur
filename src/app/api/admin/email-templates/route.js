import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await admin
    .from('email_templates')
    .select('id, name, subject, updated_at')
    .order('id')

  return Response.json({ templates: data || [] })
}
