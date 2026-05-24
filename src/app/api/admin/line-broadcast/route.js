import { sendLineMessage, broadcastCameraLine, broadcastCameraLineWithImage } from '@/lib/line'
import { requireAdmin } from '@/lib/auth'

export async function GET(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  if (type === 'birthdays') {
    const { data: models } = await admin
      .from('models')
      .select('id, name, birthday, pending_data, line_id')
      .eq('status', 'active')
    const normalized = (models || [])
      .map(m => {
        const bd = m.birthday || m.pending_data?.birthday || null
        return { ...m, birthday: bd ? bd.replace(/\//g, '-') : null }
      })
      .filter(m => m.birthday)
    return Response.json({ models: normalized })
  }

  const { data: models } = await admin
    .from('models')
    .select('id, name, line_id')
    .eq('status', 'active')
    .not('line_id', 'is', null)

  return Response.json({ count: (models || []).length, models: models || [] })
}

export async function POST(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, model_ids, channel, image_url, staff_user_id } = await req.json()
  if (!message?.trim()) return Response.json({ error: 'メッセージを入力してください' }, { status: 400 })

  // カメラマン公式LINE（broadcastAPI）
  if (channel === 'camera') {
    const result = image_url
      ? await broadcastCameraLineWithImage(message, image_url)
      : await broadcastCameraLine(message)
    return Response.json({ ok: result.ok, error: result.ok ? null : result.reason })
  }

  // モデルグループLINE
  if (channel === 'group') {
    const { data: groupRow } = await admin.from('site_settings').select('value').eq('key', 'line_group_id_all').maybeSingle()
    const groupId = groupRow?.value || process.env.LINE_GROUP_ID
    if (!groupId) return Response.json({ error: 'グループIDが設定されていません' }, { status: 400 })
    const { sendLineGroupMessageToId } = await import('@/lib/line')
    const result = await sendLineGroupMessageToId(groupId, message)
    return Response.json({ ok: result.ok, error: result.ok ? null : result.reason })
  }

  // 雑談グループLINE
  if (channel === 'zatsudan') {
    const { data: rows } = await admin.from('site_settings').select('value').eq('key', 'line_group_id_zatsudan').maybeSingle()
    const groupId = rows?.value
    if (!groupId) return Response.json({ error: '雑談グループIDが設定されていません' }, { status: 400 })
    const { sendLineGroupMessageToId } = await import('@/lib/line')
    const result = await sendLineGroupMessageToId(groupId, message)
    return Response.json({ ok: result.ok, error: result.ok ? null : result.reason })
  }

  // スタッフグループLINE
  if (channel === 'staff_group') {
    const { data: groupRow } = await admin.from('site_settings').select('value').eq('key', 'line_group_id_staff').maybeSingle()
    const groupId = groupRow?.value
    if (!groupId) return Response.json({ error: 'スタッフグループIDが設定されていません' }, { status: 400 })
    const { sendLineGroupMessageToId } = await import('@/lib/line')
    const result = await sendLineGroupMessageToId(groupId, message)
    return Response.json({ ok: result.ok, error: result.ok ? null : result.reason })
  }

  // スタッフ個別LINE
  if (channel === 'staff_individual') {
    const { data: lineIdsRow } = await admin.from('site_settings').select('value').eq('key', 'line_staff_ids').maybeSingle()
    let staffLineIds = {}
    try { staffLineIds = JSON.parse(lineIdsRow?.value || '{}') } catch {}
    const lineId = staff_user_id ? staffLineIds[staff_user_id] : null
    if (!lineId) return Response.json({ error: 'このスタッフのLINE IDが設定されていません' }, { status: 400 })
    const result = await sendLineMessage(lineId, message)
    return Response.json({ ok: result.ok, error: result.ok ? null : result.reason })
  }

  // モデルLINE（個別push）
  let targets
  if (model_ids?.length > 0) {
    const { data } = await admin.from('models').select('id, name, line_id').in('id', model_ids).not('line_id', 'is', null)
    targets = data || []
  } else {
    const { data } = await admin.from('models').select('id, name, line_id').eq('is_active', true).not('line_id', 'is', null)
    targets = data || []
  }

  let sent = 0, failed = 0
  for (const model of targets) {
    const result = await sendLineMessage(model.line_id, message)
    if (result.ok) sent++
    else failed++
    await admin.from('line_notifications').insert({
      model_id: model.id,
      type: 'broadcast',
      message,
      status: result.ok ? 'sent' : 'failed',
    }).catch(() => {})
  }

  if (failed > 0 && sent === 0) return Response.json({ ok: false, error: `送信失敗 (${failed}件)`, sent, failed }, { status: 500 })
  return Response.json({ ok: true, sent, failed })
}
