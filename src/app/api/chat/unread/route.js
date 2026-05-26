import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user?.email) return Response.json({ unread: 0 })

  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since')

  const admin = await createSupabaseAdminClient()
  let query = admin
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_email', user.email)
    .eq('sender_type', 'admin')

  if (since) query = query.gt('created_at', since)

  const { count } = await query
  return Response.json({ unread: count || 0 })
}
