import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  const querySecret = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('cron_secret')
  const secret = authHeader?.replace('Bearer ', '') || querySecret
  if (secret !== process.env.CRON_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createSupabaseAdminClient()

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 4)

  const { data: deleted, error } = await supabase
    .from('coupons')
    .delete()
    .lt('valid_until', cutoff.toISOString())
    .select('id, code')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ deleted: deleted?.length ?? 0, codes: deleted?.map(c => c.code) })
}
