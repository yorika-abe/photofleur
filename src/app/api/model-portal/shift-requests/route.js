import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await admin
    .from('shift_request_dates')
    .select('request_date, deadline, event_type, notes')
    .gte('request_date', today)
    .order('request_date', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data || [])
}
