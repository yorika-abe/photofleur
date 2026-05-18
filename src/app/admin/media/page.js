'use client'

import Image from 'next/image'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Cropper from 'react-easy-crop'

async function compressImage(file, maxW = 2000, maxH = 2000, quality = 0.88) {
  return new Promise(resolve => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality)
    }
    img.src = url
  })
}

const TABS = [
  { id: 'home', label: 'HOME' },
  { id: 'request', label: 'リクエスト撮影' },
  { id: 'recruit_page', label: 'モデル募集' },
  { id: 'ogp', label: '共有画像設定(OGP)' },
  { id: 'registration', label: '登録手続きPDF' },
  { id: 'guide', label: 'モデル活動の手引き' },
]

const OGP_PAGES = [
  { key: 'ogp_home', label: 'HOME' },
  { key: 'ogp_schedule', label: 'スケジュール一覧' },
  { key: 'ogp_models', label: 'モデル一覧' },
  { key: 'ogp_blog', label: 'ブログ一覧' },
  { key: 'ogp_request', label: 'リクエスト撮影' },
  { key: 'ogp_recruit', label: 'モデル募集' },
  { key: 'ogp_goods', label: 'グッズ' },
  { key: 'ogp_faq', label: 'FAQ' },
]

export default function AdminMediaPage() {
  const [tab, setTab] = useState('home')
  const [heroImages, setHeroImages] = useState([])
  const [heroImagesMobile, setHeroImagesMobile] = useState([])
  const [heroVideo, setHeroVideo] = useState('')
  const [heroVideo2, setHeroVideo2] = useState('')
  const [missionBg, setMissionBg] = useState('')
  const [recruitImages, setRecruitImages] = useState([])
  const [requestHeroImages, setRequestHeroImages] = useState([])
  const [recruitHeroImages, setRecruitHeroImages] = useState([])
  const [recruitPageGallery, setRecruitPageGallery] = useState([])
  const [trainingBgVideoPC, setTrainingBgVideoPC] = useState('')
  const [trainingBgVideoMobile, setTrainingBgVideoMobile] = useState('')
  const [ogpImages, setOgpImages] = useState({})
  const [pwaIcon, setPwaIcon] = useState('')
  const [ogpCrop, setOgpCrop] = useState(null) // { src, key, oldUrl, aspect, outputW, outputH, setter }
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), [])
  const [uploading, setUploading] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadCount, setUploadCount] = useState({ current: 0, total: 0 })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [onboardingImagesAbout, setOnboardingImagesAbout] = useState([])
  const [onboardingImagesRegist, setOnboardingImagesRegist] = useState([])
  const [staffOnboardingImagesAbout, setStaffOnboardingImagesAbout] = useState([])
  const [staffOnboardingImagesRegist, setStaffOnboardingImagesRegist] = useState([])
  const [guideImagesHowto, setGuideImagesHowto] = useState([])
  const [guideImagesBooking, setGuideImagesBooking] = useState([])

  useEffect(() => {
    fetch('/api/admin/site-settings').then(r => r.json()).then(data => {
      setHeroImages(JSON.parse(data.hero_bg_images || '[]'))
      setHeroImagesMobile(JSON.parse(data.hero_bg_images_mobile || '[]'))
      setHeroVideo(data.hero_video || '')
      setHeroVideo2(data.hero_video_2 || '')
      setMissionBg(data.mission_bg || '')
      setRecruitImages(JSON.parse(data.recruit_bg_images || '[]'))
      const rhi = data.request_hero_image || ''
      try { const p = JSON.parse(rhi); setRequestHeroImages(Array.isArray(p) ? p : (rhi ? [rhi] : [])) } catch { setRequestHeroImages(rhi ? [rhi] : []) }
      const mhi = data.recruit_hero_image || ''
      try { const p = JSON.parse(mhi); setRecruitHeroImages(Array.isArray(p) ? p : (mhi ? [mhi] : [])) } catch { setRecruitHeroImages(mhi ? [mhi] : []) }
      setRecruitPageGallery(JSON.parse(data.recruit_page_gallery_images || '[]'))
      setTrainingBgVideoPC(data.training_bg_video_pc || '')
      setTrainingBgVideoMobile(data.training_bg_video_mobile || '')
      const ogp = {}
      for (const { key } of OGP_PAGES) ogp[key] = data[key] || ''
      setOgpImages(ogp)
      setPwaIcon(data.pwa_icon || '')
      setOnboardingImagesAbout(JSON.parse(data.onboarding_images_about || '[]'))
      setOnboardingImagesRegist(JSON.parse(data.onboarding_images_regist || '[]'))
      setStaffOnboardingImagesAbout(JSON.parse(data.staff_onboarding_images_about || '[]'))
      setStaffOnboardingImagesRegist(JSON.parse(data.staff_onboarding_images_regist || '[]'))
      setGuideImagesHowto(JSON.parse(data.guide_images_howto || '[]'))
      setGuideImagesBooking(JSON.parse(data.guide_images_booking || '[]'))
    })
  }, [])

  function uploadWithProgress(file, path) {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', path)
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100))
      })
      xhr.addEventListener('load', () => {
        const data = JSON.parse(xhr.responseText)
        if (data.error) { reject(data.error); return }
        resolve(data.url)
      })
      xhr.addEventListener('error', () => reject('通信エラー'))
      xhr.open('POST', '/api/admin/upload')
      xhr.send(formData)
    })
  }

  async function uploadWithSignedUrl(file, key, onSuccess, oldUrl) {
    setUploading(key)
    setUploadProgress(0)
    try {
      const compressed = await compressImage(file, 2000, 2000, 0.88)
      const path = `site/${key}-${Date.now()}.jpg`
      const res = await fetch('/api/admin/upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, contentType: 'image/jpeg' }),
      })
      const { signedUrl, publicUrl, error } = await res.json()
      if (error) throw error
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject('アップロード失敗: ' + xhr.status)
        })
        xhr.addEventListener('error', () => reject('通信エラー'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', 'image/jpeg')
        xhr.send(compressed)
      })
      onSuccess(publicUrl)
      if (oldUrl) deleteFile(oldUrl)
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function uploadVideoWithSignedUrl(file, key, setter) {
    setUploading(key)
    setUploadProgress(0)
    const path = `site/${key}-${Date.now()}.${file.name.split('.').pop()}`
    try {
      const res = await fetch('/api/admin/upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, contentType: file.type }),
      })
      const { signedUrl, publicUrl, error } = await res.json()
      if (error) throw error
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject('アップロード失敗: ' + xhr.status)
        })
        xhr.addEventListener('error', () => reject('通信エラー'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })
      setter(publicUrl)
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function deleteFile(url) {
    if (!url) return
    await fetch('/api/admin/delete-storage-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  }

  async function uploadImage(file, key, setter, oldUrl) {
    setUploading(key)
    setUploadProgress(0)
    try {
      const compressed = await compressImage(file, 2000, 2000, 0.88)
      const path = `site/${key}-${Date.now()}.jpg`
      const url = await uploadWithProgress(compressed, path)
      setter(url)
      if (oldUrl) deleteFile(oldUrl)
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function startOgpCrop(file, key, oldUrl, { aspect = 1200 / 630, outputW = 1200, outputH = 630, setter = null } = {}) {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setOgpCrop({ src: URL.createObjectURL(file), key, oldUrl, aspect, outputW, outputH, setter })
  }

  async function confirmOgpCrop() {
    if (!ogpCrop || !croppedAreaPixels) return
    const { src, key, oldUrl, outputW, outputH, setter } = ogpCrop
    setOgpCrop(null)
    setUploading(key)
    setUploadProgress(0)
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new window.Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src
      })
      const { x, y, width, height } = croppedAreaPixels
      const canvas = document.createElement('canvas')
      canvas.width = outputW; canvas.height = outputH
      canvas.getContext('2d').drawImage(img, x, y, width, height, 0, 0, outputW, outputH)
      URL.revokeObjectURL(src)
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92))
      const path = `site/${key}-${Date.now()}.jpg`
      const url = await uploadWithProgress(blob, path)
      if (setter) {
        setter(url)
      } else {
        setOgpImages(prev => ({ ...prev, [key]: url }))
      }
      if (oldUrl) deleteFile(oldUrl)
    } catch (e) { alert('アップロードエラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function uploadPdfAsImages(file, baseKey, setImages) {
    setUploading(baseKey)
    setUploadProgress(0)
    setUploadCount({ current: 0, total: 0 })
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const totalPages = pdf.numPages
      setUploadCount({ current: 0, total: totalPages })
      const imageUrls = []
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
        const path = `site/${baseKey}-p${pageNum}-${Date.now()}.jpg`
        const res = await fetch('/api/admin/upload-signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, contentType: 'image/jpeg' }),
        })
        const { signedUrl, publicUrl, error } = await res.json()
        if (error) throw error
        await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob })
        imageUrls.push(publicUrl)
        setUploadCount({ current: pageNum, total: totalPages })
        setUploadProgress(Math.round(pageNum / totalPages * 100))
      }
      setImages(imageUrls)
    } catch (e) { alert('変換エラー: ' + e) }
    setUploading(null)
    setUploadProgress(0)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/admin/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hero_bg_images: JSON.stringify(heroImages),
        hero_bg_images_mobile: JSON.stringify(heroImagesMobile),
        hero_video: heroVideo,
        hero_video_2: heroVideo2,
        mission_bg: missionBg,
        recruit_bg_images: JSON.stringify(recruitImages),
        request_hero_image: JSON.stringify(requestHeroImages),
        recruit_hero_image: JSON.stringify(recruitHeroImages),
        recruit_page_gallery_images: JSON.stringify(recruitPageGallery),
        training_bg_video_pc: trainingBgVideoPC,
        training_bg_video_mobile: trainingBgVideoMobile,
        ...ogpImages,
        pwa_icon: pwaIcon,
        onboarding_images_about: JSON.stringify(onboardingImagesAbout),
        onboarding_images_regist: JSON.stringify(onboardingImagesRegist),
        staff_onboarding_images_about: JSON.stringify(staffOnboardingImagesAbout),
        staff_onboarding_images_regist: JSON.stringify(staffOnboardingImagesRegist),
        guide_images_howto: JSON.stringify(guideImagesHowto),
        guide_images_booking: JSON.stringify(guideImagesBooking),
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }

  function ProgressBar({ progress }) {
    const multi = uploadCount.total > 1
    const barW = multi ? Math.round((uploadCount.current / uploadCount.total) * 100) : progress
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 3 }}>
          <span>アップロード中{multi ? ` ${uploadCount.current} / ${uploadCount.total}` : ''}...</span>
          {!multi && <span>{progress}%</span>}
        </div>
        <div style={{ background: '#e8f4fb', borderRadius: 99, height: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1a3560', borderRadius: 99, width: `${barW}%`, transition: 'width 0.2s ease' }} />
        </div>
      </div>
    )
  }

  function MediaGrid({ items, onRemove, uploadKey, onAddImage, onAddVideo, aspect = '16/9' }) {
    const isVid = url => /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url)
    return (
      <>
        {items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 12 }}>
            {items.map((url, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio: aspect }}>
                {isVid(url) ? (
                  <video src={url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div style={{ position: 'absolute', top: 3, left: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>{i + 1}{isVid(url) ? ' 🎬' : ''}</div>
                <button onClick={() => onRemove(i)}
                  style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            📷 写真を追加（複数可）
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={!!uploading}
              onChange={async e => {
                if (!e.target.files) return
                const arr = Array.from(e.target.files)
                setUploadCount({ current: 0, total: arr.length })
                for (let i = 0; i < arr.length; i++) {
                  setUploadCount({ current: i + 1, total: arr.length })
                  await onAddImage(arr[i])
                }
                setUploadCount({ current: 0, total: 0 })
              }} />
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#444', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            🎬 動画を追加
            <input type="file" accept="video/*" style={{ display: 'none' }} disabled={!!uploading}
              onChange={e => e.target.files?.[0] && onAddVideo(e.target.files[0])} />
          </label>
        </div>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
      </>
    )
  }

  function ImageGrid({ images, onReorder, onRemove, uploadKey, onAdd, label, aspect = '3/4' }) {
    const dragIdx = useRef(null)
    const [dragOver, setDragOver] = useState(null)

    function handleDragStart(i) { dragIdx.current = i }
    function handleDrop(i) {
      if (dragIdx.current === null || dragIdx.current === i) return
      const next = [...images]
      const [moved] = next.splice(dragIdx.current, 1)
      next.splice(i, 0, moved)
      onReorder(next)
      dragIdx.current = null
      setDragOver(null)
    }

    return (
      <>
        {images.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>長押しまたはドラッグで並び替え</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 12 }}>
              {images.map((url, i) => (
                <div key={url}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => { e.preventDefault(); setDragOver(i) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => { dragIdx.current = null; setDragOver(null) }}
                  style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio: aspect, cursor: 'grab', outline: dragOver === i ? '2px solid #1a3560' : 'none', opacity: dragIdx.current === i ? 0.5 : 1 }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: 3, left: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>{i + 1}枚目</div>
                  <button onClick={() => onRemove(i)}
                    style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
            </div>
          </>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          📷 {label}
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={!!uploading}
            onChange={async e => {
              if (!e.target.files) return
              const arr = Array.from(e.target.files)
              setUploadCount({ current: 0, total: arr.length })
              for (let i = 0; i < arr.length; i++) {
                setUploadCount({ current: i + 1, total: arr.length })
                await onAdd(arr[i])
              }
              setUploadCount({ current: 0, total: 0 })
            }} />
        </label>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
      </>
    )
  }

  function SingleImageSection({ value, onChange, uploadKey, label, onFileSelect }) {
    return (
      <>
        {value && (
          <div style={{ marginBottom: 12, position: 'relative', borderRadius: 8, overflow: 'hidden', maxHeight: 140 }}>
            <img src={value} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
            <button onClick={() => { deleteFile(value); onChange('') }}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}>削除</button>
          </div>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          📷 {label}
          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!uploading}
            onChange={e => {
              if (!e.target.files?.[0]) return
              onFileSelect ? onFileSelect(e.target.files[0]) : uploadImage(e.target.files[0], uploadKey, onChange, value)
              e.target.value = ''
            }} />
        </label>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
        <div style={{ marginTop: 10 }}>
          <input style={inp} value={value} onChange={e => onChange(e.target.value)} placeholder="またはURLを直接入力" />
        </div>
      </>
    )
  }

  function VideoSection({ value, onChange, uploadKey, label }) {
    const isYoutube = value.includes('youtube') || value.includes('youtu.be')
    return (
      <>
        {value && (
          <div style={{ marginBottom: 12 }}>
            {isYoutube ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden' }}>
                <iframe src={toEmbedUrl(value)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
              </div>
            ) : (
              <video src={value} controls style={{ width: '100%', borderRadius: 8, maxHeight: 160 }} />
            )}
            <button onClick={() => onChange('')}
              style={{ marginTop: 6, background: 'none', border: '1px solid #ddd', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: '#888' }}>削除</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            🎬 {label}
            <input type="file" accept="video/*" style={{ display: 'none' }} disabled={!!uploading}
              onChange={e => e.target.files?.[0] && uploadVideoWithSignedUrl(e.target.files[0], uploadKey, onChange)} />
          </label>
        </div>
        {uploading === uploadKey && <ProgressBar progress={uploadProgress} />}
        <div style={{ marginTop: 10 }}>
          <input style={inp} value={value} onChange={e => onChange(e.target.value)} placeholder="またはYouTube URLを入力" />
        </div>
      </>
    )
  }

  function PdfSection({ title, desc, images, setImages, uploadKey }) {
    return (
      <Section title={title} desc={desc}>
        {images.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#388e3c', fontWeight: 600, marginBottom: 8 }}>✅ {images.length}ページ変換済み</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {images.slice(0, 4).map((url, i) => (
                <Image key={i} src={url} alt="" width={72} height={54} style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} />
              ))}
              {images.length > 4 && <div style={{ width: 72, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 4, fontSize: 11, color: '#888' }}>+{images.length - 4}枚</div>}
            </div>
            <button onClick={() => setImages([])}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: '#888' }}>削除</button>
          </div>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          📄 PDFをアップロード（画像に変換）
          <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={!!uploading}
            onChange={e => e.target.files?.[0] && uploadPdfAsImages(e.target.files[0], uploadKey, setImages)} />
        </label>
        {uploading === uploadKey && (
          <>
            <ProgressBar progress={uploadProgress} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>変換中... {uploadCount.current}/{uploadCount.total}ページ</div>
          </>
        )}
      </Section>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px' }}>
      {ogpCrop && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Cropper image={ogpCrop.src} crop={crop} zoom={zoom} aspect={ogpCrop.aspect ?? 1200 / 630}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          </div>
          <div style={{ background: '#1a1a2e', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center' }}>{ogpCrop.outputW}×{ogpCrop.outputH}px にトリミングされます</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, whiteSpace: 'nowrap' }}>ズーム</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={e => setZoom(Number(e.target.value))} style={{ flex: 1, accentColor: '#a8e2f4' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { URL.revokeObjectURL(ogpCrop.src); setOgpCrop(null) }}
                style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={confirmOgpCrop}
                style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#1a3560', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                この範囲でアップロード
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: '#888', textDecoration: 'none', fontSize: 13 }}>← 管理画面</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a3560', margin: 0 }}>メディア管理</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e8f4fb', overflowX: 'auto', overflowY: 'hidden', flexWrap: 'nowrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '8px 18px',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? '#1a3560' : '#888',
              borderBottom: tab === t.id ? '2px solid #1a3560' : '2px solid transparent',
              marginBottom: -2, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── HOME ── */}
        {tab === 'home' && (
          <>
            <Section title="ヒーロー背景画像（PC）" desc="複数枚登録するとフェードで自動切り替えされます（5秒間隔）">
              <ImageGrid images={heroImages} onReorder={setHeroImages} onRemove={i => setHeroImages(imgs => imgs.filter((_, idx) => idx !== i))}
                uploadKey="hero_bg" onAdd={f => uploadWithSignedUrl(f, 'hero_bg', url => setHeroImages(imgs => [...imgs, url]))} label="画像を追加（複数可）" />
            </Section>

            <Section title="ヒーロー背景画像（モバイル）" desc="スマホ用の縦長画像。未設定の場合はPC用が使用されます">
              <ImageGrid images={heroImagesMobile} onReorder={setHeroImagesMobile} onRemove={i => setHeroImagesMobile(imgs => imgs.filter((_, idx) => idx !== i))}
                uploadKey="hero_bg_mobile" onAdd={f => uploadWithSignedUrl(f, 'hero_bg_mobile', url => setHeroImagesMobile(imgs => [...imgs, url]))} label="画像を追加（複数可）" aspect="9/16" />
            </Section>

            <Section title="ヒーロー下の動画①">
              <VideoSection value={heroVideo} onChange={setHeroVideo} uploadKey="hero_video" label="動画をアップロード" />
            </Section>

            <Section title="ヒーロー下の動画②" desc="動画①のさらに下に表示されます">
              <VideoSection value={heroVideo2} onChange={setHeroVideo2} uploadKey="hero_video_2" label="動画をアップロード" />
            </Section>

            <Section title="モデル募集マーキー（写真・動画）" desc="上下のスクロール行に表示される写真・動画。上段は左に、下段は右に自動スクロール">
              <MediaGrid
                items={recruitImages}
                onRemove={i => setRecruitImages(imgs => imgs.filter((_, idx) => idx !== i))}
                uploadKey="recruit_bg"
                onAddImage={f => { setUploading('recruit_bg'); setUploadProgress(0); compressImage(f, 1600, 1600, 0.85).then(c => uploadWithProgress(c, `site/recruit-${Date.now()}.jpg`)).then(url => { setRecruitImages(imgs => [...imgs, url]); setUploading(null); setUploadProgress(0) }).catch(e => { alert(e); setUploading(null) }) }}
                onAddVideo={f => uploadVideoWithSignedUrl(f, 'recruit_bg', url => setRecruitImages(imgs => [...imgs, url]))}
              />
            </Section>

            <Section title="Missionセクション背景画像" desc="「Every flower deserves to bloom.」セクションの背景">
              <SingleImageSection value={missionBg} onChange={setMissionBg} uploadKey="mission_bg" label="画像をアップロード" />
            </Section>
          </>
        )}

        {/* ── リクエスト撮影 ── */}
        {tab === 'request' && (
          <Section title="ヒーロー背景画像" desc="複数枚登録するとフェードで自動切り替えされます">
            <ImageGrid images={requestHeroImages} onReorder={setRequestHeroImages} onRemove={i => setRequestHeroImages(imgs => imgs.filter((_, idx) => idx !== i))}
              uploadKey="request_hero" onAdd={f => uploadWithSignedUrl(f, 'request_hero', url => setRequestHeroImages(imgs => [...imgs, url]))} label="画像を追加（複数可）" aspect="16/9" />
          </Section>
        )}

        {/* ── 共有画像設定(OGP) ── */}
        {tab === 'ogp' && (
          <>
            <Section title="🏠 ホーム画面アイコン（PWA）" desc="スマホでサイトをホーム画面に追加したときに表示されるアイコンです。512×512px の正方形に自動リサイズされます。">
              {pwaIcon && (
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Image src={pwaIcon} alt="" width={80} height={80} style={{ borderRadius: 16, border: '1px solid #e5e5e5', objectFit: 'cover' }} />
                  <button onClick={() => { deleteFile(pwaIcon); setPwaIcon('') }}
                    style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#888' }}>削除</button>
                </div>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a3560', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                📷 アイコンをアップロード
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!uploading}
                  onChange={e => {
                    if (!e.target.files?.[0]) return
                    startOgpCrop(e.target.files[0], 'pwa_icon', pwaIcon, { aspect: 1, outputW: 512, outputH: 512, setter: setPwaIcon })
                    e.target.value = ''
                  }} />
              </label>
              {uploading === 'pwa_icon' && <ProgressBar progress={uploadProgress} />}
            </Section>
            <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1565c0', marginBottom: 4 }}>
              LINEやX（Twitter）でURLをシェアした時に表示される画像です。推奨サイズ：<strong>1200×630px</strong>
            </div>
            {OGP_PAGES.map(({ key, label }) => (
              <Section key={key} title={label}>
                <SingleImageSection
                  value={ogpImages[key] || ''}
                  onChange={url => setOgpImages(prev => ({ ...prev, [key]: url }))}
                  uploadKey={key}
                  label="画像をアップロード"
                  onFileSelect={f => startOgpCrop(f, key, ogpImages[key] || '')}
                />
              </Section>
            ))}
          </>
        )}

        {/* ── モデル募集 ── */}
        {tab === 'recruit_page' && (
          <>
            <Section title="ヒーロー背景画像" desc="複数枚登録するとフェードで自動切り替えされます">
              <ImageGrid images={recruitHeroImages} onReorder={setRecruitHeroImages} onRemove={i => setRecruitHeroImages(imgs => imgs.filter((_, idx) => idx !== i))}
                uploadKey="recruit_hero" onAdd={f => uploadWithSignedUrl(f, 'recruit_hero', url => setRecruitHeroImages(imgs => [...imgs, url]))} label="画像を追加（複数可）" aspect="16/9" />
            </Section>

            <Section title="充実した研修内容 背景動画（PC）" desc="研修内容セクションの背景動画。PCで表示されます">
              <VideoSection value={trainingBgVideoPC} onChange={setTrainingBgVideoPC} uploadKey="training_bg_video_pc" label="動画をアップロード" />
            </Section>

            <Section title="充実した研修内容 背景動画（モバイル）" desc="研修内容セクションの背景動画。モバイルで表示されます（未設定の場合はPC用を使用）">
              <VideoSection value={trainingBgVideoMobile} onChange={setTrainingBgVideoMobile} uploadKey="training_bg_video_mobile" label="動画をアップロード" />
            </Section>

            <Section title="ギャラリー（写真・動画）" desc="大切にしていることセクションの上に表示されるマーキーギャラリー。上下2行でスクロール表示">
              <MediaGrid
                items={recruitPageGallery}
                onRemove={i => setRecruitPageGallery(imgs => imgs.filter((_, idx) => idx !== i))}
                uploadKey="recruit_page_gallery"
                onAddImage={f => {
                  setUploading('recruit_page_gallery'); setUploadProgress(0)
                  compressImage(f, 1600, 1600, 0.85)
                    .then(c => uploadWithProgress(c, `site/recruit-gallery-${Date.now()}.jpg`))
                    .then(url => { setRecruitPageGallery(imgs => [...imgs, url]); setUploading(null); setUploadProgress(0) })
                    .catch(e => { alert(e); setUploading(null) })
                }}
                onAddVideo={f => uploadVideoWithSignedUrl(f, 'recruit_page_gallery', url => setRecruitPageGallery(imgs => [...imgs, url]))}
              />
            </Section>
          </>
        )}

        {/* ── モデル活動の手引き ── */}
        {tab === 'guide' && (
          <>
            <PdfSection title="モデフルの使い方" desc="シフト提出や変更・予約状況の確認（モデル活動の手引きページに表示されます）"
              images={guideImagesHowto} setImages={setGuideImagesHowto} uploadKey="guide_images_howto" />
            <PdfSection title="予約の埋め方・Xの運用方法" desc="予約を埋めるのに大切なのはXの運用です（モデル活動の手引きページに表示されます）"
              images={guideImagesBooking} setImages={setGuideImagesBooking} uploadKey="guide_images_booking" />
          </>
        )}

        {/* ── 登録手続きPDF ── */}
        {tab === 'registration' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560', padding: '4px 0 8px', borderBottom: '1px solid #e8f4fb' }}>モデル登録手続き</div>
            <PdfSection title="ABOUT Photo Fleur" desc="モデル登録手引きページのABOUT PHOTO FLEURセクションに表示されます"
              images={onboardingImagesAbout} setImages={setOnboardingImagesAbout} uploadKey="onboarding_images_about" />
            <PdfSection title="撮影会モデル登録説明" desc="モデル登録手引きページの撮影会モデル登録説明セクションに表示されます"
              images={onboardingImagesRegist} setImages={setOnboardingImagesRegist} uploadKey="onboarding_images_regist" />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3560', padding: '12px 0 8px', borderBottom: '1px solid #e8f4fb' }}>スタッフ登録手続き</div>
            <PdfSection title="ABOUT Photo Fleur" desc="スタッフ登録手引きページのABOUT PHOTO FLEURセクションに表示されます"
              images={staffOnboardingImagesAbout} setImages={setStaffOnboardingImagesAbout} uploadKey="staff_onboarding_images_about" />
            <PdfSection title="撮影会スタッフ登録説明" desc="スタッフ登録手引きページの撮影会スタッフ登録説明セクションに表示されます"
              images={staffOnboardingImagesRegist} setImages={setStaffOnboardingImagesRegist} uploadKey="staff_onboarding_images_regist" />
          </>
        )}

      </div>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={save} disabled={saving}
          style={{ background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? '保存中...' : '保存する'}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: '#388e3c', fontWeight: 600 }}>✓ 保存しました</span>
        )}
      </div>
    </div>
  )
}

function Section({ title, desc, children }) {
  return (
    <section style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #d6ecf5' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a3560', marginTop: 0, marginBottom: desc ? 2 : 12 }}>{title}</h2>
      {desc && <p style={{ fontSize: 11, color: '#aaa', marginBottom: 12, marginTop: 0 }}>{desc}</p>}
      {children}
    </section>
  )
}

function toEmbedUrl(url) {
  if (!url) return ''
  if (url.includes('youtube.com/watch')) return `https://www.youtube.com/embed/${new URL(url).searchParams.get('v')}`
  if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}`
  return url
}
