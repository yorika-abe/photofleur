'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const LINE_LINK_URL = '/api/auth/line?mode=link&next=/request'

function CheckRow({ label, current, required, met, red }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef4f8' }}>
      <span style={{ fontSize: 13, color: '#3a3050' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: met ? '#2e7d32' : (red ? '#c62828' : '#888') }}>
        {met ? `${current}/${required} ✅` : `${current}/${required} ❌`}
      </span>
    </div>
  )
}

export default function EligibilityChecker({ models }) {
  const router = useRouter()
  const [loggedIn, setLoggedIn] = useState(null)
  const [selectedModelIds, setSelectedModelIds] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/customer/request-eligibility')
      .then(r => r.json())
      .then(d => {
        if (d.notLoggedIn) { setLoggedIn(false); return }
        setLoggedIn(true)
        setResult(d)
      })
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    setLoading(true)
    const params = selectedModelIds.length > 0 ? `?model_ids=${selectedModelIds.join(',')}` : ''
    fetch(`/api/customer/request-eligibility${params}`)
      .then(r => r.json())
      .then(d => { setResult(d); setLoading(false) })
  }, [selectedModelIds, loggedIn])

  const sectionStyle = {
    background: '#fff',
    padding: 'clamp(32px, 5vw, 56px) 20px',
    borderTop: '1px solid #eef4f8',
  }

  if (loggedIn === null) return null

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.4em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Eligibility</p>
          <h2 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 400, margin: 0, color: '#0d1f3a' }}>
            👤 ご利用条件を確認
          </h2>
        </div>

        {!loggedIn ? (
          <div style={{ background: '#f8fbff', borderRadius: 12, padding: '28px', border: '1px solid #d6ecf5', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#556070', marginBottom: 20 }}>ご利用条件を確認するにはログインが必要です</p>
            <a href="/login?redirect=/request" style={{ display: 'inline-block', background: '#1a3560', color: '#fff', borderRadius: 8, padding: '12px 32px', fontSize: 14, fontWeight: 700, textDecoration: 'none', marginBottom: 12 }}>
              ログインする
            </a>
            <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>LINEアカウントでもログインできます</p>
          </div>
        ) : (
          <div style={{ background: '#f8fbff', borderRadius: 12, padding: '24px 28px', border: '1px solid #d6ecf5' }}>
            {/* モデル選択 */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3560', marginBottom: 10 }}>ご希望のモデルを選択してください</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {models.map(m => {
                  const selected = selectedModelIds.includes(m.id)
                  return (
                    <button key={m.id} type="button"
                      onClick={() => setSelectedModelIds(prev =>
                        selected ? prev.filter(id => id !== m.id) : [...prev, m.id]
                      )}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: selected ? '#1a3560' : '#fff',
                        color: selected ? '#fff' : '#3a3050',
                        border: `2px solid ${selected ? '#1a3560' : '#d0e4f0'}`,
                        borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}>
                      {m.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {loading ? (
              <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center' }}>読み込み中...</p>
            ) : result && (
              <div>
                <CheckRow label="Photo Fleur撮影回数" current={result.totalCount} required={10} met={result.meetsTotal} red={!result.meetsTotal} />
                <CheckRow label="前3ヶ月以内" current={result.recentCount} required={2} met={result.meetsRecent} red={!result.meetsRecent} />

                {selectedModelIds.length > 0 && result.modelCounts?.map(mc => {
                  const model = models.find(m => m.id === mc.model_id)
                  const met = mc.count >= 3
                  return (
                    <div key={mc.model_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef4f8' }}>
                      <span style={{ fontSize: 13, color: '#3a3050' }}>希望モデル撮影（{model?.name}）</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: met ? '#2e7d32' : '#c62828' }}>
                        {mc.count}/3 {met ? '✅' : '❌'}
                      </span>
                    </div>
                  )
                })}

                {selectedModelIds.length === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef4f8' }}>
                    <span style={{ fontSize: 13, color: '#3a3050' }}>希望モデル撮影</span>
                    <span style={{ fontSize: 13, color: '#aaa' }}>モデルを選択してください</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                  <span style={{ fontSize: 13, color: '#3a3050' }}>LINEアカウント連携</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: result.hasLine ? '#2e7d32' : '#c62828' }}>
                    {result.hasLine ? '✅' : '❌'}
                  </span>
                </div>

                {!result.hasLine && (
                  <div style={{ marginTop: 12, padding: '12px 16px', background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe082' }}>
                    <p style={{ fontSize: 13, color: '#856404', margin: '0 0 10px' }}>LINEアカウントを連携してください</p>
                    <a href={LINE_LINK_URL}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#06C755', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700 }}>
                      LINEアカウントを連携する
                    </a>
                    <p style={{ fontSize: 11, color: '#888', margin: '8px 0 0' }}>ログインもLINEでできるようになります</p>
                  </div>
                )}

                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <button
                    disabled={!result.eligible || selectedModelIds.length === 0}
                    onClick={() => {
                      const params = new URLSearchParams({ model_ids: selectedModelIds.join(',') })
                      router.push(`/request/apply?${params}`)
                    }}
                    style={{
                      background: (result.eligible && selectedModelIds.length > 0) ? '#1a3560' : '#ccc',
                      color: '#fff', border: 'none', borderRadius: 10, padding: '14px 40px',
                      fontSize: 15, fontWeight: 700, cursor: (result.eligible && selectedModelIds.length > 0) ? 'pointer' : 'not-allowed',
                      width: '100%', maxWidth: 360,
                    }}>
                    リクエスト撮影に申し込む
                  </button>
                  {!result.eligible && result.hasLine && selectedModelIds.length > 0 && (
                    <p style={{ fontSize: 12, color: '#c62828', marginTop: 8 }}>赤字の条件を満たしていないため申し込めません</p>
                  )}
                  {selectedModelIds.length === 0 && (
                    <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>モデルを選択してください</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
