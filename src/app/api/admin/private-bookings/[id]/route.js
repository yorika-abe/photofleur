import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role, roles').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return null
  return admin
}

export async function PATCH(req, { params }) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { cancel } = await req.json()

  if (cancel) {
    const { data: booking } = await admin
      .from('private_bookings')
      .select('product_id, cancelled_at')
      .eq('id', id)
      .single()

    if (!booking) return Response.json({ error: 'Not found' }, { status: 404 })
    if (booking.cancelled_at) return Response.json({ ok: true, already: true })

    await admin.from('private_bookings').update({ cancelled_at: new Date().toISOString() }).eq('id', id)

    // 在庫を1戻す
    const { data: product } = await admin
      .from('private_products')
      .select('stock')
      .eq('id', booking.product_id)
      .single()
    if (product) {
      await admin.from('private_products').update({ stock: product.stock + 1 }).eq('id', booking.product_id)
    }

    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
