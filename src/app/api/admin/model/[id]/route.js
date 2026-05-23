import { requireAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { deleteFromR2 } from '@/lib/r2'
import { sendLineGroupMessage, sendLineMessage } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

export async function GET(_req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data, error } = await admin.from('models').select('*').eq('id', id).single()
  if (error) return Response.json({ error: error.message }, { status: 404 })
  if (data?.user_id) {
    const { data: profile } = await admin.from('user_profiles').select('email').eq('id', data.user_id).single()
    if (profile?.email) data.linked_email = profile.email
  }
  return Response.json(data)
}

export async function PUT(req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const { data: current } = await admin.from('models').select('image, portfolio_images').eq('id', id).single()
  if (current) {
    const toDelete = []
    if (current.image && current.image !== body.image) toDelete.push(current.image)
    const oldPf = current.portfolio_images || []
    const newPf = body.portfolio_images || []
    for (const url of oldPf) {
      if (!newPf.includes(url)) toDelete.push(url)
    }
    if (toDelete.length > 0) await deleteFromR2(toDelete)
  }

  const { error } = await admin.from('models').update(body).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function POST(req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action, email } = await req.json()

  if (action === 'approve') {
    const { data: model } = await admin.from('models').select('*').eq('id', id).single()
    // Step 1: まず status と pending_data だけ確実に更新
    const { error: statusError } = await admin.from('models')
      .update({ status: 'active', pending_data: null })
      .eq('id', id)
    if (statusError) {
      console.error('approve status error:', statusError)
      return Response.json({ error: statusError.message }, { status: 500 })
    }

    // Step 2: pending_data の内容（プロフィール変更）を反映
    if (model?.pending_data) {
      const ALLOWED = ['name', 'name_en', 'bio', 'height', 'birthday', 'shoe_size',
        'image', 'twitter_url', 'instagram_url', 'favorite_things', 'portfolio_images']
      const profileUpdates = {}
      for (const key of ALLOWED) {
        if (key in model.pending_data) profileUpdates[key] = model.pending_data[key]
      }
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await admin.from('models').update(profileUpdates).eq('id', id)
        if (profileError) {
          console.error('approve profile fields error:', profileError, profileUpdates)
          return Response.json({ error: 'プロフィール更新に失敗しました: ' + profileError.message }, { status: 500 })
        }
      }

      // 古い画像を削除
      const toDelete = []
      if (model.image && model.pending_data.image && model.image !== model.pending_data.image)
        toDelete.push(model.image)
      const oldPf = model.portfolio_images || []
      const newPf = model.pending_data.portfolio_images || []
      for (const url of oldPf) {
        if (!newPf.includes(url)) toDelete.push(url)
      }
      if (toDelete.length > 0) await deleteFromR2(toDelete)
    }

    // XアカウントURLが新規追加された場合にLINE雑談へ通知
    const hadTwitter = !!model?.twitter_url
    const newTwitter = model?.pending_data?.twitter_url
    if (!hadTwitter && newTwitter) {
      const modelName = model.pending_data?.name || model.name || ''
      const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'x_account_created').maybeSingle()
      const template = tmplRow?.body || '{{name}}のXアカウントが作成されました！\nみんなフォローしてね✨\n🔗{{url}}'
      const message = template.replace(/{{name}}/g, modelName).replace(/{{url}}/g, newTwitter)
      sendLineGroupMessage(message).catch(err => console.error('LINE送信エラー:', err))
    }

    if (model?.line_id) {
      const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'profile_change_approved').maybeSingle()
      const message = tmplRow?.body || DEFAULTS.profile_change_approved
      sendLineMessage(model.line_id, message).catch(err => console.error('LINE送信エラー:', err))
    }

    return Response.json({ ok: true })
  }

  if (action === 'reject') {
    const { data: current } = await admin.from('models').select('status, line_id').eq('id', id).single()
    const newStatus = current?.status === 'active' ? 'active' : 'inactive'
    await admin.from('models').update({ status: newStatus, pending_data: null }).eq('id', id)

    if (current?.line_id) {
      const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'profile_change_rejected').maybeSingle()
      const message = tmplRow?.body || DEFAULTS.profile_change_rejected
      sendLineMessage(current.line_id, message).catch(err => console.error('LINE送信エラー:', err))
    }

    return Response.json({ ok: true })
  }

  if (action === 'link_user') {
    const authAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: { users } } = await authAdmin.auth.admin.listUsers()
    const found = users?.find(u => u.email === email)
    if (!found) return Response.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    await admin.from('models').update({ user_id: found.id }).eq('id', id)
    return Response.json({ ok: true, user_id: found.id })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(_req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: model } = await admin.from('models').select('image, portfolio_images').eq('id', id).single()
  if (model) {
    const toDelete = []
    if (model.image) toDelete.push(model.image)
    for (const url of model.portfolio_images || []) {
      if (url) toDelete.push(url)
    }
    if (toDelete.length > 0) await deleteFromR2(toDelete)
  }

  await admin.from('models').delete().eq('id', id)
  return Response.json({ ok: true })
}
