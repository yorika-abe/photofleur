import { requireAdmin } from '@/lib/auth'

export async function GET(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') // 'pending' | 'responded' | 'all'

  const query = admin
    .from('request_applications')
    .select('id, user_id, status, created_at, location, nickname, sns_url, last_name, first_name, notes, email, phone')
    .order('created_at', { ascending: false })

  const { data: apps } = await query

  if (!apps?.length) return Response.json({ applications: [] })

  const appIds = apps.map(a => a.id)

  const [{ data: prefs }, { data: appModels }] = await Promise.all([
    admin.from('request_date_preferences').select('*').in('application_id', appIds).order('preference_order'),
    admin.from('request_application_models')
      .select('id, application_id, model_id, notified_at, reminder_sent_at, models(id, name, line_id, studio_price, price_tier, image)')
      .in('application_id', appIds),
  ])

  const appModelIds = (appModels || []).map(m => m.id)
  const { data: responses } = appModelIds.length
    ? await admin.from('model_request_responses').select('*').in('application_model_id', appModelIds)
    : { data: [] }

  const enriched = apps.map(a => {
    const aModels = (appModels || []).filter(m => m.application_id === a.id)
    const modelResponses = aModels.map(am => ({
      ...am,
      responses: (responses || []).filter(r => r.application_model_id === am.id),
    }))
    const allResponded = aModels.length > 0 && aModels.every(am =>
      (responses || []).some(r => r.application_model_id === am.id)
    )
    return {
      ...a,
      preferences: (prefs || []).filter(p => p.application_id === a.id),
      model_responses: modelResponses,
      all_responded: allResponded,
      deadline: aModels[0]?.notified_at
        ? new Date(new Date(aModels[0].notified_at).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null,
    }
  })

  // スタッフ募集の確定スタッフを取得
  const { data: staffRecs } = await admin
    .from('staff_recruitments')
    .select('id, request_application_id')
    .in('request_application_id', appIds)
    .not('request_application_id', 'is', null)

  const staffRecMap = {}
  for (const sr of staffRecs || []) staffRecMap[sr.request_application_id] = sr.id

  const staffRecIds = (staffRecs || []).map(sr => sr.id)
  let confirmedStaffMap = {}
  if (staffRecIds.length > 0) {
    const { data: confirmedApps } = await admin
      .from('staff_recruitment_applications')
      .select('recruitment_id, user_name, available_dates')
      .in('recruitment_id', staffRecIds)
      .eq('status', 'confirmed')
      .limit(1)
    for (const ca of confirmedApps || []) {
      const appId = Object.entries(staffRecMap).find(([, rid]) => rid === ca.recruitment_id)?.[0]
      if (appId) confirmedStaffMap[appId] = { user_name: ca.user_name, available_dates: ca.available_dates }
    }
  }

  const enrichedWithStaff = enriched.map(a => ({
    ...a,
    confirmed_staff: confirmedStaffMap[a.id] || null,
  }))

  const filtered = statusFilter === 'responded'
    ? enrichedWithStaff.filter(a => a.all_responded)
    : statusFilter === 'pending'
      ? enrichedWithStaff.filter(a => !a.all_responded && ['pending', 'notified'].includes(a.status))
      : enrichedWithStaff

  return Response.json({ applications: filtered })
}

export async function PATCH(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  if (!id || !status) return Response.json({ error: 'パラメータ不足' }, { status: 400 })

  const { error } = await admin.from('request_applications').update({ status }).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
