// Required Supabase tables:
// chat_messages: id uuid pk, user_email text, sender_type text ('user'|'admin'),
//   sender_id uuid, sender_name text, message text, image_url text, created_at timestamptz default now()
// chat_reads: user_email text, admin_id uuid, last_read_at timestamptz, pk(user_email, admin_id)

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineGroupMessage } from '@/lib/line'

export const dynamic = 'force-dynamic'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user?.email) return Response.json({ messages: [] })

  const admin = await createSupabaseAdminClient()
  const { data } = await admin
    .from('chat_messages')
    .select('*')
    .eq('user_email', user.email)
    .order('created_at', { ascending: true })

  return Response.json({ messages: data || [] })
}

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, image_url } = await req.json()
  if (!message?.trim() && !image_url) return Response.json({ error: 'Empty' }, { status: 400 })

  const admin = await createSupabaseAdminClient()

  const { data: profile } = await admin.from('user_profiles').select('name').eq('id', user.id).single()
  const senderName = profile?.name || user.email.split('@')[0]

  const { data: msg, error } = await admin.from('chat_messages').insert({
    user_email: user.email,
    sender_type: 'user',
    sender_id: user.id,
    sender_name: senderName,
    message: message?.trim() || null,
    image_url: image_url || null,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  try {
    const preview = message?.trim()
      ? message.trim().slice(0, 30) + (message.trim().length > 30 ? '…' : '')
      : '📷 画像'
    await sendLineGroupMessage(
      `【🙋チャット通知】\n未読のチャットがあります\n送信者：${senderName}\n内容：${preview}\n👉 管理画面で確認してください`
    )
  } catch {}

  return Response.json({ message: msg })
}
