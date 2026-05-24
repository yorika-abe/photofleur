import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineMessage, sendLineGroupMessageToId } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

function sanitize(str, maxLen = 200) {
  return String(str || '')
    .replace(/[\r\n]/g, ' ')
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]))
    .trim()
    .slice(0, maxLen)
}

async function getTemplate(admin, key) {
  const { data } = await admin.from('line_templates').select('body').eq('key', key).maybeSingle()
  const result = data?.body || DEFAULTS[key] || ''
  if (!result) console.warn('Template not found:', key)
  return result
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

function buildRecruitNoticeBlock(r) {
  let date = '', location = '', shoot_time = '', type_label = '', model_names = ''
  if (r.type === 'custom') {
    date = fmtDate(r.recruit_date)
    location = sanitize(r.location || '未定')
    shoot_time = sanitize(r.shoot_time || '未定')
    type_label = r.shoot_type === 'request' ? 'リクエスト撮影' : '通常撮影会'
    model_names = sanitize((r.models_info || []).map(m => m.name).join('、') || '未定')
  } else if (r.type === 'event') {
    const e = r.event || {}
    date = fmtDate(e.event_date)
    location = sanitize([e.title, e.subtitle].filter(Boolean).join(' ') || '未定')
    shoot_time = '未定'
    type_label = '通常撮影会'
    model_names = '（イベント詳細参照）'
  } else if (r.type === 'request') {
    const b = r.booking || {}
    date = fmtDate(b.event_date_input)
    location = sanitize(b.meeting_place || '未定')
    shoot_time = sanitize(b.shooting_time || '未定')
    type_label = 'リクエスト撮影'
    model_names = sanitize(b.private_products?.models?.name || '未定')
  }
  return `ーーー${date}ーーー\n【📍集合場所】${location}\n【⏰撮影時間】${shoot_time}\n【❓撮影形式】${type_label}\n【👠撮影モデル】${model_names}`
}

function buildRecruitLine(r) {
  if (r.type === 'custom') {
    const models = sanitize((r.models_info || []).map(m => m.name).join('、'))
    const typeLabel = r.shoot_type === 'request' ? 'リク撮' : '通常撮影会'
    return `${fmtDate(r.recruit_date)} 📍${sanitize(r.location || '未定')}　${sanitize(r.shoot_time || '未定')}（${typeLabel}）${models ? `　撮影モデル：${models}` : ''}`
  }
  if (r.type === 'event') {
    const e = r.event
    if (!e) return '（イベント情報なし）'
    return `${fmtDate(e.event_date)} 📍${sanitize(e.title)}${e.subtitle ? `　${sanitize(e.subtitle)}` : ''}　（通常イベント）`
  }
  if (r.type === 'request') {
    const b = r.booking
    if (!b) return '（予約情報なし）'
    const modelName = sanitize(b.private_products?.models?.name || '')
    return `${fmtDate(b.event_date_input) || '未定'} 📍${sanitize(b.meeting_place || '')}　${sanitize(b.shooting_time || '')}${modelName ? `　${modelName}` : ''}（リク撮）`
  }
  return ''
}

function calcAssemblyTime(shoot_time) {
  if (!shoot_time) return '未定'
  const match = shoot_time.match(/(\d{1,2}):(\d{2})/)
  if (!match) return '未定'
  let h = parseInt(match[1])
  let m = parseInt(match[2]) - 15
  if (m < 0) { m += 60; h -= 1 }
  if (h < 0) h += 24
  return `${h}:${m.toString().padStart(2, '0')}`
}

function buildConfirmedVars(r) {
  let date = '', location = '', shoot_time = '', model_names = '', photographer_info = ''
  if (r.type === 'custom') {
    date = fmtDate(r.recruit_date)
    location = r.location || '未定'
    shoot_time = r.shoot_time || '未定'
    model_names = (r.models_info || []).map(m => m.name).join('、') || '未定'
    const parts = []
    if (r.photographer_name) parts.push(r.photographer_name)
    if (r.photographer_nickname) parts.push(r.photographer_nickname)
    if (r.photographer_sns) parts.push(r.photographer_sns)
    if (r.payment_status === '支払い済み') parts.push('✅ 支払い済み')
    else if (r.payment_status === '当日現金') parts.push('❌ 当日現金払い')
    else if (r.payment_status) parts.push('❓ 未定')
    photographer_info = parts.join('\n') || '未定'
  } else if (r.type === 'event') {
    const e = r.event || {}
    date = fmtDate(e.event_date)
    location = [e.title, e.subtitle].filter(Boolean).join(' ')  || '未定'
    shoot_time = '未定'
    model_names = '（イベント詳細参照）'
    photographer_info = '（情報なし）'
  } else if (r.type === 'request') {
    const b = r.booking || {}
    date = fmtDate(b.event_date_input)
    location = b.meeting_place || '未定'
    shoot_time = b.shooting_time || '未定'
    model_names = b.private_products?.models?.name || '未定'
    const parts = []
    const name = [b.last_name, b.first_name].filter(Boolean).join(' ')
    if (name) parts.push(name)
    if (b.nickname) parts.push(`（${b.nickname}）`)
    if (b.sns_url) parts.push(b.sns_url)
    if (b.payment_method === 'card') parts.push('✅ カード決済済み')
    else if (b.payment_method === 'cash') parts.push('❌ 当日現金払い')
    photographer_info = parts.join('\n') || '未定'
  }
  return { date, location, assembly_time: calcAssemblyTime(shoot_time), shoot_time, model_names, photographer_info }
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
      .select('id, event_date_input, meeting_place, shooting_time, last_name, first_name, nickname, sns_url, payment_method, private_products(title, models(id, name, line_id))')
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

  const { data: allProfiles } = await admin.from('user_profiles').select('id, name, role, roles')
  const staffUsers = (allProfiles || []).filter(p => {
    const roles = p.roles?.length > 0 ? p.roles : (p.role ? [p.role] : [])
    return roles.includes('staff')
  }).map(p => ({ id: p.id, name: p.name }))

  return Response.json({ recruitments, openEvents: openEvents || [], privateBookings: privateBookings || [], models: activeModels || [], staffUsers })
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
      photographer_name: entry.photographer_name || null,
      photographer_nickname: entry.photographer_nickname || null,
      photographer_sns: entry.photographer_sns || null,
      payment_status: entry.payment_status || '未定',
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
      const details = enriched.map(r => buildRecruitNoticeBlock(r)).filter(Boolean).join('\n\n')
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

  const body = await req.json()
  const { action, recruitment_id, application_id, event_id, private_booking_id, staff_user_id } = body

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
      try { staffLineIds = JSON.parse(lineIdsRow?.value || '{}') } catch (e) { console.error('Failed to parse line_staff_ids:', e) }
      const staffLineId = app ? staffLineIds[app.user_id] : null

      const enriched = await enrichRecruitments(admin, [rec])
      const recEnriched = enriched[0]
      const detailLine = buildRecruitLine(recEnriched)

      if (staffLineId) {
        const tmpl = await getTemplate(admin, 'staff_confirmed_notice')
        const msg = applyVars(tmpl, buildConfirmedVars(recEnriched))
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
    const { data: app } = await admin.from('staff_recruitment_applications')
      .update({ status: 'cancelled' })
      .eq('id', application_id)
      .select()
      .single()
    await admin.from('staff_recruitments').update({ status: 'open' }).eq('id', recruitment_id)

    try {
      const { data: rec } = await admin.from('staff_recruitments').select('*').eq('id', recruitment_id).single()
      const enriched = await enrichRecruitments(admin, [rec])
      const detailLine = buildRecruitLine(enriched[0])
      const staffName = app?.user_name || ''

      const { data: lineIdsRow } = await admin.from('site_settings').select('value').eq('key', 'line_staff_ids').maybeSingle()
      let staffLineIds = {}
      try { staffLineIds = JSON.parse(lineIdsRow?.value || '{}') } catch (e) { console.error('Failed to parse line_staff_ids:', e) }
      const staffLineId = app ? staffLineIds[app.user_id] : null
      if (staffLineId) {
        const tmpl = await getTemplate(admin, 'staff_cancel_notice')
        await sendLineMessage(staffLineId, applyVars(tmpl, { details: detailLine }))
      }

      if (rec.type === 'custom' || rec.type === 'request') {
        const modelLineIds = []
        if (rec.type === 'custom' && enriched[0].models_info?.length > 0)
          for (const m of enriched[0].models_info) if (m.line_id) modelLineIds.push(m.line_id)
        if (rec.type === 'request' && enriched[0].booking?.private_products?.models?.line_id)
          modelLineIds.push(enriched[0].booking.private_products.models.line_id)
        if (modelLineIds.length > 0) {
          const modelTmpl = await getTemplate(admin, 'staff_model_cancel_notice')
          for (const lineId of modelLineIds)
            await sendLineMessage(lineId, applyVars(modelTmpl, { details: detailLine, staff_name: staffName }))
        }
      }
    } catch {}

    return Response.json({ ok: true })
  }

  if (action === 'notify_re_recruit') {
    try {
      const { data: rec } = await admin.from('staff_recruitments').select('*').eq('id', recruitment_id).single()
      const enriched = await enrichRecruitments(admin, [rec])
      const detailLine = buildRecruitNoticeBlock(enriched[0])
      const { data: groupRow } = await admin.from('site_settings').select('value').eq('key', 'line_group_id_staff').maybeSingle()
      const groupId = groupRow?.value
      if (groupId) {
        const tmpl = await getTemplate(admin, 'staff_re_recruit_notice')
        await sendLineGroupMessageToId(groupId, applyVars(tmpl, { details: detailLine }))
      }
    } catch {}
    return Response.json({ ok: true })
  }

  if (action === 'delete_with_notify') {
    const { data: rec } = await admin.from('staff_recruitments').select('*').eq('id', recruitment_id).single()
    const { data: confirmedApps } = await admin.from('staff_recruitment_applications')
      .select('*').eq('recruitment_id', recruitment_id).eq('status', 'confirmed')
    try {
      const enriched = await enrichRecruitments(admin, [rec])
      const detailLine = buildRecruitLine(enriched[0])
      const { data: lineIdsRow } = await admin.from('site_settings').select('value').eq('key', 'line_staff_ids').maybeSingle()
      let staffLineIds = {}
      try { staffLineIds = JSON.parse(lineIdsRow?.value || '{}') } catch (e) { console.error('Failed to parse line_staff_ids:', e) }
      const tmpl = await getTemplate(admin, 'staff_event_cancel_notice')
      for (const app of confirmedApps || []) {
        const lineId = staffLineIds[app.user_id]
        if (lineId) await sendLineMessage(lineId, applyVars(tmpl, { details: detailLine }))
      }
    } catch {}
    await admin.from('staff_recruitments').delete().eq('id', recruitment_id)
    return Response.json({ ok: true })
  }

  if (action === 'delete') {
    await admin.from('staff_recruitments').delete().eq('id', recruitment_id)
    return Response.json({ ok: true })
  }

  if (action === 'update_recruitment') {
    const f = body.fields || {}
    await admin.from('staff_recruitments').update({
      recruit_date: f.recruit_date || null,
      shoot_type: f.shoot_type || null,
      location: f.location || null,
      shoot_time: f.shoot_time || null,
      model_ids: f.model_ids || [],
      capacity: f.capacity || 1,
      photographer_name: f.photographer_name || null,
      photographer_nickname: f.photographer_nickname || null,
      photographer_sns: f.photographer_sns || null,
      payment_status: f.payment_status || '未定',
    }).eq('id', recruitment_id)
    return Response.json({ ok: true })
  }

  if (action === 'convert_recruitment') {
    const { to_type, to_event_id, to_booking_id } = body
    await admin.from('staff_recruitments').update({
      type: to_type,
      event_id: to_event_id || null,
      private_booking_id: to_booking_id || null,
      recruit_date: null,
      shoot_type: null,
      location: null,
      shoot_time: null,
      model_ids: [],
      status: 'closed',
    }).eq('id', recruitment_id)
    return Response.json({ ok: true })
  }

  if (action === 'direct_assign') {
    // Find or create recruitment for this event/booking
    let recId = recruitment_id
    let rec
    if (!recId) {
      let existing = null
      if (event_id) {
        const { data } = await admin.from('staff_recruitments').select('*').eq('event_id', event_id).eq('type', 'event').maybeSingle()
        existing = data
      } else if (private_booking_id) {
        const { data } = await admin.from('staff_recruitments').select('*').eq('private_booking_id', private_booking_id).eq('type', 'request').maybeSingle()
        existing = data
      }
      if (existing) {
        recId = existing.id; rec = existing
      } else {
        const { data: newRec } = await admin.from('staff_recruitments').insert({
          type: event_id ? 'event' : 'request',
          event_id: event_id || null,
          private_booking_id: private_booking_id || null,
          capacity: 1,
          status: 'closed',
        }).select().single()
        recId = newRec.id; rec = newRec
      }
    } else {
      const { data } = await admin.from('staff_recruitments').select('*').eq('id', recId).single()
      rec = data
    }

    const { data: staffProfile } = await admin.from('user_profiles').select('id, name').eq('id', staff_user_id).single()

    await admin.from('staff_recruitment_applications').delete().eq('recruitment_id', recId).eq('user_id', staff_user_id)
    await admin.from('staff_recruitment_applications').insert({
      recruitment_id: recId,
      user_id: staff_user_id,
      user_name: staffProfile?.name || '',
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })

    try {
      const { data: lineIdsRow } = await admin.from('site_settings').select('value').eq('key', 'line_staff_ids').maybeSingle()
      let staffLineIds = {}
      try { staffLineIds = JSON.parse(lineIdsRow?.value || '{}') } catch (e) { console.error('Failed to parse line_staff_ids:', e) }
      const staffLineId = staffLineIds[staff_user_id]
      if (staffLineId && rec) {
        const enriched = await enrichRecruitments(admin, [rec])
        const tmpl = await getTemplate(admin, 'staff_confirmed_notice')
        const msg = applyVars(tmpl, buildConfirmedVars(enriched[0]))
        await sendLineMessage(staffLineId, msg)
      }
    } catch {}

    return Response.json({ ok: true })
  }

  return Response.json({ error: 'invalid action' }, { status: 400 })
}
