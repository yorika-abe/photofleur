import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const { mode, name, email, password, token } = await req.json()

    if (!token || token.trim() !== (process.env.STAFF_INVITE_TOKEN || '').trim()) {
      return Response.json({ error: '登録に失敗しました' }, { status: 403 })
    }
    if (!email) {
      return Response.json({ error: 'メールアドレスを入力してください' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return Response.json({ error: '登録に失敗しました' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    if (mode === 'existing') {
      // 既存アカウントにスタッフ権限を追加
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, roles, role')
        .eq('email', email)
        .maybeSingle()

      if (!profile) {
        return Response.json({ error: 'このメールアドレスのアカウントが見つかりません' }, { status: 404 })
      }

      const currentRoles = profile.roles?.length > 0 ? profile.roles : (profile.role ? [profile.role] : [])
      if (currentRoles.includes('staff')) {
        return Response.json({ error: 'すでにスタッフ権限が付与されています' }, { status: 400 })
      }

      const newRoles = [...currentRoles, 'staff']
      await supabase.from('user_profiles').update({
        roles: newRoles,
        registered_via_invite: true,
        invite_notif_seen: false,
      }).eq('id', profile.id)

      return Response.json({ ok: true, mode: 'existing' })
    }

    // 新規登録
    if (!name || !password) {
      return Response.json({ error: '必須項目が不足しています' }, { status: 400 })
    }
    if (password.length < 8) {
      return Response.json({ error: 'パスワードは8文字以上で設定してください' }, { status: 400 })
    }

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (createError) {
      if (createError.message.includes('already')) {
        return Response.json({ error: 'このメールアドレスはすでに登録されています' }, { status: 400 })
      }
      return Response.json({ error: createError.message }, { status: 400 })
    }

    await supabase.from('user_profiles').upsert({
      id: userData.user.id,
      name,
      email,
      roles: ['staff'],
      role: 'staff',
      registered_via_invite: true,
      invite_notif_seen: false,
    }, { onConflict: 'id' })

    return Response.json({ ok: true, mode: 'new' })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
