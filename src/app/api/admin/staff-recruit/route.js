import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineMessage, sendLineGroupMessageToId } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

async function getTemplate(admin, key) {
  const { data } = await admin.from('line_templates').select('body').eq('key', key).maybeSingle()
  return data?.body || DEFAULTS[key] || ''
}

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

const DOW = ['日', '月', '火', '水', '木', '金', '土']
function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getMonth() + 1}/${dt.getDate()}（${DOW[dt.getDay()]}）`
}

function buildRecruitLine(r) {
  if (r.type === 'custom') {
    const models = (r.models_info || []).map(m => m.name).join('、')
    const typeLabel = r.shoot_type === 'request' ? 'リク撮' : '通常撮影会'
    return `${fmtDate(r.recruit_date)} 📍${r.location || '未定'}　${r.shoot_time || '未定'}（${typeLabel}）${models ? `　撮影モデル：${models}` : ''}`
  }
  if (r.type === 'event') {
    const e = r.event
    if (!e) return '（イベント情報なし）'
    return `${fmtDate(e.event_date)} 📍${e.title}${e.subtitle ? `　${e.subtitle}` : ''}　（通常イベント）`
  }
  if (r.type === 'request') {
    const b = r.booking
    if (!b) return '（予約情報なし）'
    const modelName = b.private_products?.models?.name || ''
    return `${fmtDate(b.event_date_input) || '未定'} 📍${b.meeting_place || ''}　${b.shooting_time || ''}${modelName ? `　${modelName}` : ''}（リク撮）`
  }
  return ''
}

async function enrichRecruitments(admin, recruitments) {
  const eventIds = [...new Set((recruitments).filter(r => r.event_id).map(r => r.event_id))]
  let eventsMap = {}
  if (eventIds.length > 0) {
    const { data } = await admin.from('events').select('id, title, subtitle, event_date').in('id', eventIds)
    for (const e of data || []) eventsMap[e.id] = e
  }

  const bookingIds = [...new Set((recruitments).filter(r => r.private_booking_id).map(r => r.private_booking_id))]
  let bookingsMap = {}
  if (bookingIds.length > 0) {
    const { data } = await admin.from('private_bookings')
      .select('id, event_date_input, meeting_place, shooting_time, private_products(title, models(id, name, line_id))')
      .in('id', bookingIds)
    for (const b of data || []) bookingsMap[b.id] = b
  }

  const allModelIds = []
  for (const r of recruitments) if (r.model_ids?.length > 0) allModelIds.push(...r.model_ids)
  let modelsMap = {}
  if (allModelIds.length > 0) {
    const { data } = await admin.from('models').select('id, name, line_id').in('id', [...new Set(allModelIds)])
    for (const m of data || []) modelsMap[m.id] = m
  }

  return recruitments.map(r => ({
    ...r,
    event: r.event_id ? eventsMap[r.event_id] : null,
    booking: r.private_booking_id ? bookingsMap[r.private_booking_id] : null,
    models_info: (r.model_ids || []).map(id => modelsMap[id]).filter(Boolean),
  }))
}

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rawRecruitments } = await admin
    .from('staff_recruitments')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: applications } = await admin
    .from('staff_recruitment_applications')
    .select('*')
    .order('applied_at', { ascending: true })

  const appsMap = {}
  for (const app of applications || []) {
    if (!appsMap[app.recruitment_id]) appsMap[app.recruitment_id] = []
    appsMap[app.recruitment_id].push(app)
  }

  const enriched = await enrichRecruitments(admin, rawRecruitments || [])
  const recruitments = enriched.map(r => ({ ...r, applications: appsMap[r.id] || [] }))

  const { data: openEvents } = await admin
    .from('events')
    .select('id, title, subtitle, event_date')
    .eq('status', 'active')
    .order('event_date', { ascending: false })

  const { data: privateBookings } = await admin
    .from('private_bookings')
    .select('id, event_date_input, meeting_place, shooting_time, private_products(title, models(name))')
    .is('cancelled_at', null)
    .order('event_date_input', { ascending: true, nullsFirst: false })

  const { data: activeModels } = await admin
    .from('models')
    .select('id, name')
    .eq('status', 'active')
    .order('display_order', { ascending: true })

  return Response.json({ recruitments, openEvents: openEvents || [], privateBookings: privateBookings || [], models: activeModels || [] })
}

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { entries } = await req.json()
  if (!entries?.length) return Response.json({ error: 'no entries' }, { status: 400 })

  const inserted = []
  for (const entry of entries) {
    const { data, error } = await admin.from('staff_recruitments').insert({
      type: entry.type,
      recruit_date: entry.recruit_date || null,
      shoot_type: entry.shoot_type || null,
      location: entry.location || null,
      shoot_time: entry.shoot_time || null,
      model_ids: entry.model_ids || [],
      event_id: entry.event_id || null,
      private_booking_id: entry.private_booking_id || null,
      capacity: entry.capacity || 1,
      status: 'open',
    }).select().single()
    if (!error && data) inserted.push(data)
  }

  // Send LINE to staff group
  try {
    const { data: groupRow } = await admin.from('site_settings').select('value').eq('key', 'line_group_id_staff').maybeSingle()
    const groupId = groupRow?.value
    if (groupId && inserted.length > 0) {
      const enriched = await enrichRecruitments(admin, inserted)
      const details = enriched.map(r => buildRecruitLine(r)).filter(Boolean).join('\n')
      const tmpl = await getTemplate(admin, 'staff_recruit_notice')
      const msg = applyVars(tmpl, { details })
      await sendLineGroupMessageToId(groupId, msg)
    }
  } catch {}

  return Response.json({ ok: true, inserted })
}

export async function PATCH(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, recruitment_id, application_id } = await req.json()

  if (action === 'confirm_application') {
    const { data: app } = await admin.from('staff_recruitment_applications')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', application_id)
      .select()
      .single()

    const { data: rec } = await admin.from('staff_recruitments').select('*').eq('id', recruitment_id).single()
    const { count } = await admin.from('staff_recruitment_applications')
      .select('*', { count: 'exact', head: true })
      .eq('recruitment_id', recruitment_id)
      .eq('status', 'confirmed')
    if (rec && count >= rec.capacity) {
      await admin.from('staff_recruitments').update({ status: 'closed' }).eq('id', recruitment_id)
    }

    // Send LINE to confirmed staff
    try {
      const { data: lineIdsRow } = await admin.from('site_settings').select('value').eq('key', 'line_staff_ids').maybeSingle()
      let staffLineIds = {}
      try { staffLineIds = JSON.parse(lineIdsRow?.value || '{}') } catch {}
      const staffLineId = app ? staffLineIds[app.user_id] : null

      const enriched = await enrichRecruitments(admin, [rec])
      const recEnriched = enriched[0]
      const detailLine = buildRecruitLine(recEnriched)

      if (staffLineId) {
        const tmpl = await getTemplate(admin, 'staff_confirmed_notice')
        const msg = applyVars(tmpl, { details: detailLine })
        await sendLineMessage(staffLineId, msg)
      }

      // Send to model if custom or request type
      if (rec.type === 'custom' || rec.type === 'request') {
        const staffName = app?.user_name || ''
        const modelLineIds = []
        if (rec.type === 'custom' && recEnriched.models_info?.length > 0) {
          for (const m of recEnriched.models_info) if (m.line_id) modelLineIds.push(m.line_id)
        }
        if (rec.type === 'request' && recEnriched.booking?.private_products?.models?.line_id) {
          modelLineIds.push(recEnriched.booking.private_products.models.line_id)
        }
        if (modelLineIds.length > 0) {
          const modelTmpl = await getTemplate(admin, 'staff_model_notice')
          for (const lineId of modelLineIds) {
            const msg = applyVars(modelTmpl, { details: detailLine, staff_name: staffName })
            await sendLineMessage(lineId, msg)
          }
        }
      }
    } catch {}

    return Response.json({ ok: true })
  }

  if (action === 'cancel_application') {
    await admin.from('staff_recruitment_applications').update({ status: 'cancelled' }).eq('id', application_id)
    await admin.from('staff_recruitments').update({ status: 'open' }).eq('id', recruitment_id)
    return Response.json({ ok: true })
  }

  if (action === 'delete') {
    await admin.from('staff_recruitments').delete().eq('id', recruitment_id)
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'invalid action' }, { status: 400 })
}
