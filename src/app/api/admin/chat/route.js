import { requireAdmin } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { sendLineCameraUser } from '@/lib/line'
import { Resend } from 'resend'
import { renderEmailTemplate, generateHtml } from '@/lib/email-render'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'

export const dynamic = 'force-dynamic'

// GET ?list=1 → room list with unread counts
// GET ?email=xxx → messages for a room (also marks as read)
// POST → admin sends message { user_email, message, image_url }
// PUT → mark room as read { user_email }

export async function GET(req) {
  const server = await createSupabaseServerClient()
  const { data: { user: currentUser } } = await server.auth.getUser()
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const list = searchParams.get('list')

  if (list) {
    const { data: messages } = await admin
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })

    // Group into rooms
    const roomMap = {}
    for (const msg of (messages || [])) {
      if (!roomMap[msg.user_email]) {
        roomMap[msg.user_email] = { user_email: msg.user_email, last_message: msg, total: 0 }
      }
      roomMap[msg.user_email].total++
    }

    // Get read timestamps for this admin
    const { data: reads } = await admin
      .from('chat_reads')
      .select('user_email, last_read_at')
      .eq('admin_id', currentUser.id)

    const readMap = {}
    for (const r of (reads || [])) readMap[r.user_email] = r.last_read_at

    // Count unread (messages from others after last_read_at)
    const rooms = Object.values(roomMap).map(room => {
      const lastRead = readMap[room.user_email]
      const unread = (messages || []).filter(m =>
        m.user_email === room.user_email &&
        m.sender_id !== currentUser.id &&
        (!lastRead || m.created_at > lastRead)
      ).length
      return { ...room, unread }
    })

    // Sort by last message time
    rooms.sort((a, b) => new Date(b.last_message.created_at) - new Date(a.last_message.created_at))

    // Enrich with user profile names
    const emails = rooms.map(r => r.user_email)
    const { data: profiles } = emails.length
      ? await admin.from('user_profiles').select('id, name, email').in('email', emails)
      : { data: [] }
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.email, p]))

    return Response.json({ rooms: rooms.map(r => ({ ...r, profile: profileMap[r.user_email] || null })) })
  }

  if (email) {
    const { data: messages } = await admin
      .from('chat_messages')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: true })

    // Auto-mark as read
    await admin.from('chat_reads').upsert(
      { user_email: email, admin_id: currentUser.id, last_read_at: new Date().toISOString() },
      { onConflict: 'user_email,admin_id' }
    )

    return Response.json({ messages: messages || [] })
  }

  return Response.json({ error: 'Bad request' }, { status: 400 })
}

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user: currentUser } } = await server.auth.getUser()
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_email, message, image_url } = await req.json()
  if (!user_email) return Response.json({ error: 'Missing user_email' }, { status: 400 })
  if (!message?.trim() && !image_url) return Response.json({ error: 'Empty' }, { status: 400 })

  const { data: myProfile } = await admin.from('user_profiles').select('name').eq('id', currentUser.id).single()
  const senderName = myProfile?.name || '運営'

  const { data: msg, error } = await admin.from('chat_messages').insert({
    user_email,
    sender_type: 'admin',
    sender_id: currentUser.id,
    sender_name: senderName,
    message: message?.trim() || null,
    image_url: image_url || null,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Mark this room as read for this admin
  await admin.from('chat_reads').upsert(
    { user_email, admin_id: currentUser.id, last_read_at: new Date().toISOString() },
    { onConflict: 'user_email,admin_id' }
  )

  // Notify user via LINE + email
  try {
    const { data: userProfile } = await admin
      .from('user_profiles')
      .select('line_camera_id, name')
      .eq('email', user_email)
      .single()

    const replyPreview = message?.trim() || '（画像）'

    // LINE
    if (userProfile?.line_camera_id) {
      const lineText = [
        '【チャットに返信があります】',
        'チャットでのお問い合わせありがとうございます！',
        '',
        'ーーーーーーーーーー',
        '運営からの返信',
        'ーーーーーーーーーー',
        replyPreview,
        '',
        'LINEは送信専用です。',
        `HP chatからご確認ください✨\n${SITE_URL}/chat`,
      ].join('\n')
      await sendLineCameraUser(userProfile.line_camera_id, lineText)
    }

    // Email
    const resend = new Resend(process.env.RESEND_API_KEY)
    const customerName = userProfile?.name || user_email.split('@')[0]
    const vars = { customer_name: customerName, reply_message: replyPreview }
    const rendered = await renderEmailTemplate(admin, 'chat-reply', vars)
    const emailHtml = rendered?.html ?? generateHtml(
      [
        { id: 1, cells: [{ id: 1, block: { id: 1, type: 'heading', data: { text: 'チャットに返信があります', size: 24, align: 'center', color: '#1a3560', font: 'Arial, sans-serif', bold: true, italic: false, letterSpacing: 0, paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 } } }], colWidths: [100], bg: { color: '', imageUrl: '' } },
        { id: 2, cells: [{ id: 2, block: { id: 2, type: 'text', data: { text: `${customerName} 様\n\nチャットでのお問い合わせありがとうございます！\n運営より返信が届いています。`, size: 15, align: 'left', color: '#333', font: 'Arial, sans-serif', bold: false, italic: false, letterSpacing: 0, lineHeight: 1.9, paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 } } }], colWidths: [100], bg: { color: '', imageUrl: '' } },
        { id: 3, cells: [{ id: 3, block: { id: 3, type: 'text', data: { text: `運営からの返信\n\n${replyPreview}`, size: 15, align: 'left', color: '#1a3560', font: 'Arial, sans-serif', bold: false, italic: false, letterSpacing: 0, lineHeight: 2, paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 } } }], colWidths: [100], bg: { color: '#f5f5f5', imageUrl: '' } },
        { id: 4, cells: [{ id: 4, block: { id: 4, type: 'text', data: { text: 'メールは送信専用です。\nHPのチャットよりご確認ください✨', size: 13, align: 'left', color: '#555', font: 'Arial, sans-serif', bold: false, italic: false, letterSpacing: 0, lineHeight: 2, paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 } } }], colWidths: [100], bg: { color: '', imageUrl: '' } },
        { id: 5, cells: [{ id: 5, block: { id: 5, type: 'button', data: { label: '💬 チャットを開く', url: `${SITE_URL}/chat`, bgColor: '#1a3560', textColor: '#fff', align: 'center', paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 } } }], colWidths: [100], bg: { color: '', imageUrl: '' } },
      ],
      { bgColor: '#1a3560', text: 'PhotoFleur', textColor: '#ffffff', fontSize: 20 },
      'PhotoFleur運営'
    )
    const emailSubject = rendered?.subject ?? '【チャットに返信があります】PhotoFleur'
    await resend.emails.send({
      from: 'PhotoFleur <noreply@photofleur.jp>',
      to: user_email,
      subject: emailSubject,
      html: emailHtml,
    })
  } catch {}

  return Response.json({ message: msg })
}

export async function PUT(req) {
  const server = await createSupabaseServerClient()
  const { data: { user: currentUser } } = await server.auth.getUser()
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_email } = await req.json()
  if (!user_email) return Response.json({ error: 'Missing user_email' }, { status: 400 })

  await admin.from('chat_reads').upsert(
    { user_email, admin_id: currentUser.id, last_read_at: new Date().toISOString() },
    { onConflict: 'user_email,admin_id' }
  )

  return Response.json({ ok: true })
}
