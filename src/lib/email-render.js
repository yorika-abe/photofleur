// Shared email HTML rendering — used by newsletter editor and all email send routes

export const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;600;700&family=Dancing+Script:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Josefin+Sans:wght@300;400;600&family=EB+Garamond:ital,wght@0,400;1,400&family=Noto+Sans+JP:wght@300;400;700&family=Noto+Serif+JP:wght@300;400;700&family=M+PLUS+Rounded+1c:wght@300;400;700&family=Zen+Kaku+Gothic+New:wght@300;400;700&family=Shippori+Mincho:wght@400;700&display=swap'

function boxWrap(data, inner) {
  const pt = data.paddingTop ?? 8, pb = data.paddingBottom ?? 8
  const pl = data.paddingLeft ?? 8, pr = data.paddingRight ?? 8
  const mh = data.minHeight || 0
  const style = `padding:${pt}px ${pr}px ${pb}px ${pl}px;${mh ? `min-height:${mh}px;` : ''}box-sizing:border-box;`
  return `<div style="${style}">${inner}</div>`
}

export function blockToHtml(b) {
  const { type, data } = b
  if (type === 'heading' || type === 'text') {
    const tag = type === 'heading' ? 'h2' : 'p'
    const shadow = data.shadow ? 'text-shadow:1px 1px 4px rgba(0,0,0,0.3);' : ''
    const style = [
      `font-size:${data.size}px`, `color:${data.color}`, `text-align:${data.align}`,
      `font-family:${data.font || 'Arial, sans-serif'}`,
      `font-weight:${data.bold ? '700' : '400'}`,
      `font-style:${data.italic ? 'italic' : 'normal'}`,
      `letter-spacing:${data.letterSpacing || 0}px`,
      `line-height:${data.lineHeight || (type === 'heading' ? 1.4 : 1.8)}`,
      `margin:0`, `white-space:pre-wrap`, shadow,
    ].filter(Boolean).join(';')
    return boxWrap(data, `<${tag} style="${style}">${data.text}</${tag}>`)
  }
  if (type === 'image') {
    if (!data.url) return boxWrap(data, '<div style="background:#f0f4fb;height:80px;border-radius:4px;"></div>')
    const wStyle = data.width && data.width !== '100%' ? `width:${data.width};` : 'max-width:100%;'
    const hStyle = data.height && data.height !== 'auto' ? `height:${data.height};object-fit:cover;` : ''
    const effects = [
      `border-radius:${data.borderRadius || 0}px`,
      `opacity:${(data.opacity ?? 100) / 100}`,
      data.shadow ? 'box-shadow:0 4px 16px rgba(0,0,0,0.2)' : '',
      data.grayscale ? 'filter:grayscale(100%)' : '',
    ].filter(Boolean).join(';')
    const img = `<img src="${data.url}" alt="${data.alt || ''}" style="${wStyle}${hStyle}display:block;margin:0 auto;${effects}" />`
    return boxWrap(data, `<div style="text-align:center;">${data.link ? `<a href="${data.link}" style="display:inline-block;">${img}</a>` : img}</div>`)
  }
  if (type === 'button') return boxWrap(data, `<div style="text-align:${data.align};"><a href="${data.url || '#'}" style="display:inline-block;background:${data.bgColor};color:${data.textColor};text-decoration:none;border-radius:8px;padding:12px 32px;font-size:15px;font-weight:700;">${data.label}</a></div>`)
  if (type === 'divider') return boxWrap(data, `<hr style="border:none;border-top:${data.thickness}px solid ${data.color};margin:0;" />`)
  if (type === 'spacer') return `<div style="height:${data.height}px;"></div>`
  return ''
}

function rowBgStyle(bg) {
  if (!bg) return ''
  if (bg.imageUrl) return `background:url('${bg.imageUrl}') center/cover no-repeat;`
  if (bg.color) return `background:${bg.color};`
  return ''
}

function rowToHtml(row) {
  const bg = rowBgStyle(row.bg)
  const wrapStyle = `padding:8px;${bg}`
  if (row.cells.length === 1) {
    const inner = row.cells[0].block ? blockToHtml(row.cells[0].block) : ''
    return bg ? `<div style="${wrapStyle}">${inner}</div>` : inner
  }
  const cols = row.cells.map((c, i) =>
    `<td width="${Math.round(row.colWidths[i])}%" style="vertical-align:top;">${c.block ? blockToHtml(c.block) : ''}</td>`
  ).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;${bg}"><tr>${cols}</tr></table>`
}

export function generateHtml(rows, header, footer) {
  return `<!DOCTYPE html><html><head><link href="${GOOGLE_FONTS_URL}" rel="stylesheet"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
<div style="background:${header.bgColor};padding:24px 32px;text-align:center;">
<span style="color:${header.textColor};font-size:${header.fontSize}px;font-weight:700;letter-spacing:0.05em;">${header.text}</span>
</div>
<div style="padding:24px 32px;">
${rows.map(rowToHtml).join('\n')}
</div>
<div style="background:#f5f5f5;padding:16px 32px;font-size:11px;color:#999;text-align:center;">
${footer}
</div>
</div>
</body></html>`
}

// Replace {{variable}} placeholders with actual values
export function substituteVars(html, vars) {
  let result = html
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, String(val ?? ''))
  }
  return result
}

// Load a saved template from Supabase and return { subject, html } with vars substituted
// Returns null if no template saved yet
export async function renderEmailTemplate(supabase, templateId, vars = {}) {
  const { data: tmpl } = await supabase
    .from('email_templates')
    .select('subject, rows_json, header_json, footer')
    .eq('id', templateId)
    .single()

  if (!tmpl) return null

  let html = generateHtml(tmpl.rows_json || [], tmpl.header_json || { bgColor: '#1a3560', text: 'PhotoFleur', textColor: '#ffffff', fontSize: 20 }, tmpl.footer || '')
  html = substituteVars(html, vars)
  const subject = substituteVars(tmpl.subject || '', vars)
  return { subject, html }
}
