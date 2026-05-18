export async function compressImage(file, { maxWidth = 1920, quality = 0.85, aspectRatio = null } = {}) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height

        if (aspectRatio) {
          const imgRatio = img.width / img.height
          if (imgRatio > aspectRatio) {
            srcW = Math.round(img.height * aspectRatio)
            srcX = Math.round((img.width - srcW) / 2)
          } else {
            srcH = Math.round(img.width / aspectRatio)
            srcY = Math.round((img.height - srcH) / 2)
          }
        }

        let dstW = srcW
        let dstH = srcH
        if (dstW > maxWidth) {
          dstH = Math.round(dstH * maxWidth / dstW)
          dstW = maxWidth
        }

        const canvas = document.createElement('canvas')
        canvas.width = dstW
        canvas.height = dstH
        canvas.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, dstW, dstH)
        canvas.toBlob((blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return }
          resolve(blob)
        }, 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
