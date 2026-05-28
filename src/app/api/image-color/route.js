import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function analyzePixels(data) {
  const buckets = new Float32Array(36)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const l = (max + min) / 2
    if (max === min) continue
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (s < 0.2 || l < 0.12 || l > 0.88) continue
    let h = 0
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
    buckets[Math.floor(h * 360 / 10) % 36] += s
  }
  const maxVal = Math.max(...buckets)
  if (maxVal === 0) return '#a8e2f4'
  const hue = buckets.indexOf(maxVal) * 10
  return hslToHex(hue, 78, 72)
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  if (!url) return Response.json({ color: '#a8e2f4' })

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'PhotoFleur/1.0' } })
    if (!res.ok) return Response.json({ color: '#a8e2f4' })

    const buf = Buffer.from(await res.arrayBuffer())
    const { data } = await sharp(buf).resize(16, 16).raw().toBuffer({ resolveWithObject: true })
    const color = analyzePixels(data)
    return Response.json({ color }, {
      headers: { 'Cache-Control': 'public, max-age=86400' }
    })
  } catch {
    return Response.json({ color: '#a8e2f4' })
  }
}
