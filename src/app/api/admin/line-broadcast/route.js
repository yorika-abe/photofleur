import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineMessage, sendLineGroupMessage, broadcastCameraLine } from '@/lib/line'

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

export async function GET(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  if (type === 'birthdays') {
    const { data: models } = await admin
      .from('models')
      .select('id, name, birthday, line_id')
      .eq('is_active', true)
      .not('birthday', 'is', null)
    return Response.json({ models: models || [] })
  }

  const { data: models } = await admin
    .from('models')
    .select('id, name, line_id')
    .eq('is_active', true)
    .not('line_id', 'is', null)

  return Response.json({ count: (models || []).length, models: models || [] })
}

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, model_ids, channel } = await req.json()
  if (!message?.trim()) return Response.json({ error: 'メッセージを入力してください' }, { status: 400 })

  // カメラマン公式LINE（broadcastAPI）
  if (channel === 'camera') {
    const result = await broadcastCameraLine(message)
    return Response.json({ ok: result.ok, error: result.ok ? null : result.reason })
  }

  // モデルグループLINE
  if (channel === 'group') {
    const result = await sendLineGroupMessage(message)
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

  return Response.json({ ok: true, sent, failed })
}
