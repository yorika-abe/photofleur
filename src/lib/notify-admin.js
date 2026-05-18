import { sendLineGroupMessageToId } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

export async function notifyAdmin(supabase, templateKey, vars = {}) {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'line_group_id_admin')
      .maybeSingle()
    const groupId = data?.value
    if (!groupId) return
    const { data: tmplRow } = await supabase
      .from('line_templates')
      .select('body')
      .eq('key', templateKey)
      .maybeSingle()
    let message = tmplRow?.body || DEFAULTS[templateKey]
    if (!message) return
    for (const [k, v] of Object.entries(vars)) {
      message = message.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v ?? '')
    }
    sendLineGroupMessageToId(groupId, message).catch(err =>
      console.error('Admin LINE通知エラー:', err)
    )
  } catch {}
}
