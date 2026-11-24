/**
 * @file Client-side image helper: downscale a photo to <= 800px (longest side) and encode it
 * as a JPEG data URL, shrinking quality until it fits ~550KB. Handles EXIF rotation.
 * @exports resizeImageToDataUrl
 * @usedBy src/components/field/EchoComposer.tsx
 */
const MAX_DIM = 800
const MAX_CHARS = 740_000

async function load(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; done: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { src: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close() }
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  await new Promise<void>((ok, fail) => {
    img.onload = () => ok()
    img.onerror = () => fail(new Error('Could not read this image'))
    img.src = url
  })
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) }
}

export async function resizeImageToDataUrl(file: File): Promise<string> {
  const { src, w, h, done } = await load(file)
  try {
    const scale = Math.min(1, MAX_DIM / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(w * scale))
    canvas.height = Math.max(1, Math.round(h * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
    let q = 0.8
    let out = canvas.toDataURL('image/jpeg', q)
    while (out.length > MAX_CHARS && q > 0.3) {
      q -= 0.1
      out = canvas.toDataURL('image/jpeg', q)
    }
    return out
  } finally {
    done()
  }
}
