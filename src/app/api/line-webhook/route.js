import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')
  const secret = process.env.LINE_CHANNEL_SECRET
  if (secret) {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
    if (signature !== expected) return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }
  const data = JSON.parse(rawBody)

  for (const event of data.events || []) {
    // ボットがグループに追加された → グループIDをログ
    if (event.type === 'join' && event.source?.type === 'group') {
      const groupId = event.source.groupId
      console.log('LINE Group ID:', groupId)

      // グループIDをSupabaseのsettingsテーブルに保存（あれば）
      await supabase.from('app_settings').upsert({
        key: 'line_group_id',
        value: groupId,
      }).catch(() => {})
    }

    // 誰かがグループでメッセージ送信 → グループIDをログ
    if (event.type === 'message' && event.source?.type === 'group') {
      const groupId = event.source.groupId
      console.log('LINE Group ID (from message):', groupId)
    }

    // モデルがボットを友達追加 → userIDをログ
    if (event.type === 'follow') {
      const userId = event.source.userId
      console.log('LINE User ID (follow):', userId)
    }
  }

  return Response.json({ ok: true })
}

// LINE webhookの疎通確認用
export async function GET() {
  return Response.json({ ok: true })
}
