import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const { email, password, token } = await req.json()

    if (token !== process.env.MODEL_INVITE_TOKEN) {
      return Response.json({ error: '無効な招待リンクです' }, { status: 403 })
    }
    if (!email || !password) {
      return Response.json({ error: '必須項目が不足しています' }, { status: 400 })
    }
    if (password.length < 8) {
      return Response.json({ error: 'パスワードは8文字以上で設定してください' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Create user with email confirmed
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      if (createError.message.includes('already')) {
        return Response.json({ error: 'このメールアドレスはすでに登録されています' }, { status: 400 })
      }
      return Response.json({ error: createError.message }, { status: 400 })
    }

    const userId = userData.user.id

    // Set user_profiles: model role + registered_via_invite
    await supabase.from('user_profiles').upsert({
      id: userId,
      email,
      roles: ['model'],
      role: 'model',
      registered_via_invite: true,
      invite_notif_seen: false,
    }, { onConflict: 'id' })

    // Create models entry
    await supabase.from('models').insert({
      user_id: userId,
      status: 'pending',
    })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
