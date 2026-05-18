import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const modelId = searchParams.get('model_id')
  if (!modelId) return Response.json([])

  const admin = await createSupabaseAdminClient()
  const { data } = await admin
    .from('contributed_photos')
    .select('*')
    .contains('model_ids', [modelId])
    .order('created_at', { ascending: false })

  const emails = [...new Set((data || []).map(p => p.user_email).filter(Boolean))]
  let nicknameMap = {}
  if (emails.length > 0) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const emailToId = Object.fromEntries((users || []).map(u => [u.email, u.id]))
    const ids = emails.map(e => emailToId[e]).filter(Boolean)
    if (ids.length > 0) {
      const { data: profiles } = await admin.from('customer_profiles').select('user_id, nickname').in('user_id', ids)
      for (const p of profiles || []) {
        const user = (users || []).find(u => u.id === p.user_id)
        if (user && p.nickname) nicknameMap[user.email] = p.nickname
      }
    }
  }

  return Response.json((data || []).map(p => ({ ...p, nickname: nicknameMap[p.user_email] || null })))
}
