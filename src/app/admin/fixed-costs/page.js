import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'
import FixedCostsClient from './FixedCostsClient'

export const dynamic = 'force-dynamic'

export default async function FixedCostsPage() {
  const serverClient = await createSupabaseServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  const supabase = await createSupabaseAdminClient()

  const [{ data: profile }, { data: costs }] = await Promise.all([
    user ? supabase.from('user_profiles').select('role').eq('id', user.id).single() : { data: null },
    supabase.from('fixed_costs').select('*').order('created_at', { ascending: true }),
  ])

  const isOwner = profile?.role === 'owner'

  return <FixedCostsClient initialCosts={costs || []} isOwner={isOwner} />
}
