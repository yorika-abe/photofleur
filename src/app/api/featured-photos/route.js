import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await admin
    .from('contributed_photos')
    .select('id, photo_url, sns_url, user_email, created_at')
    .eq('is_featured', true)
    .order('featured_order', { ascending: true })

  if (error) return Response.json([])

  // user_email → name マップ
  const emails = [...new Set((data || []).map(p => p.user_email).filter(Boolean))]
  let nameMap = {}
  if (emails.length > 0) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const emailToId = Object.fromEntries((users || []).map(u => [u.email, u.id]))
    const ids = emails.map(e => emailToId[e]).filter(Boolean)
    if (ids.length > 0) {
      const { data: profiles } = await admin.from('customer_profiles').select('id, last_name, first_name').in('id', ids)
      for (const p of profiles || []) {
        const user = (users || []).find(u => u.id === p.id)
        if (user) nameMap[user.email] = [p.last_name, p.first_name].filter(Boolean).join(' ')
      }
    }
  }

  return Response.json((data || []).map(p => ({
    id: p.id,
    photo_url: p.photo_url,
    sns_url: p.sns_url,
    display_name: nameMap[p.user_email] || null,
  })))
}
