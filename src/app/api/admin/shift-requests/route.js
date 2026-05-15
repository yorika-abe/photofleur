import { requireAdmin } from '@/lib/auth'
import { sendLineGroupMessage, buildShiftOpenMessage } from '@/lib/line'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  // 過去の指定日を自動削除
  await admin.from('shift_request_dates').delete().lt('request_date', today)

  const { data, error } = await admin
    .from('shift_request_dates')
    .select('*')
    .order('request_date', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { request_date, dates, event_type, notes, deadline, notify } = body

  // 複数日まとめて登録
  const targetDates = dates && dates.length > 0 ? dates : [request_date]

  // 既存の日付を取得して重複を除外
  const { data: existing } = await admin
    .from('shift_request_dates')
    .select('request_date')
    .in('request_date', targetDates)
  const existingSet = new Set((existing || []).map(r => r.request_date))
  const newDates = targetDates.filter(d => !existingSet.has(d))

  if (newDates.length === 0) return Response.json([])

  const rows = newDates.map(d => ({
    request_date: d,
    event_type: event_type || 'both',
    notes: notes || null,
    deadline: deadline || null,
  }))

  const { data, error } = await admin.from('shift_request_dates').insert(rows).select()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (notify) {
    await sendLineGroupMessage(buildShiftOpenMessage()).catch(() => {})
  }

  return Response.json(data)
}

export async function DELETE(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await admin.from('shift_request_dates').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
