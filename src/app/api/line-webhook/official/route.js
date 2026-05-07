import crypto from 'crypto'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function validateSignature(rawBody, secret, signature) {
  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
  return hash === signature
}

export async function POST(req) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') || ''

  const secret = process.env.LINE_CAMERA_CHANNEL_SECRET
  if (secret && !validateSignature(rawBody, secret, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body
  try { body = JSON.parse(rawBody) } catch { return Response.json({ ok: true }) }

  const admin = await createSupabaseAdminClient()

  for (const event of body.events || []) {
    const source = event.source || {}

    if (event.type === 'join' && source.type === 'group') {
      const groupId = source.groupId
      await admin.from('site_settings').upsert(
        { key: 'line_group_id_last_joined_official', value: groupId },
        { onConflict: 'key' }
      )
      console.log(`[photofleur公式] Joined group: ${groupId}`)
    }

    if (event.type === 'message' && source.type === 'group') {
      console.log(`[photofleur公式] Message from group: ${source.groupId}`)
    }
  }

  return Response.json({ ok: true })
}
