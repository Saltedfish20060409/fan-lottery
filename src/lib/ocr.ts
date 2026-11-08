import { buildOcrBoxes, type OcrBox, type OcrLine } from './nickname'

type PaddleOCRInstance = {
  predict: (input: Blob | File | HTMLCanvasElement) => Promise<
    Array<{
      image: { width: number; height: number }
      items: Array<{
        text: string
        score: number
        poly: Array<{ x: number; y: number } | number[]>
      }>
    }>
  >
}

export interface OcrPageResult {
  id: string
  fileName: string
  imageUrl: string
  boxes: OcrBox[]
}

let ocrPromise: Promise<PaddleOCRInstance> | null = null
let cachedMaxSide: number | null = null

/**
 * Pick OCR longest-side budget from device hints.
 * Biased toward 更稳更快: weak phones get stronger downscale.
 */
export function getOcrMaxSide(): number {
  if (cachedMaxSide != null) return cachedMaxSide

  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean; effectiveType?: string }
  }
  const cores = nav.hardwareConcurrency || 2
  const mem = nav.deviceMemory // GiB, Chrome only; undefined elsewhere
  const ua = nav.userAgent || ''
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    (nav.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900)
  const saveData = Boolean(nav.connection?.saveData)
  const slowNet = /2g|slow-2g|3g/i.test(nav.connection?.effectiveType || '')

  // Score: higher = stronger device
  let score = 0
  if (cores >= 8) score += 3
  else if (cores >= 6) score += 2
  else if (cores >= 4) score += 1

  if (mem != null) {
    if (mem >= 8) score += 3
    else if (mem >= 4) score += 2
    else if (mem >= 2) score += 0
    else score -= 2
  } else if (isMobile) {
    score -= 1 // unknown memory on phone → be conservative
  } else {
    score += 1 // desktop without deviceMemory still usually OK
  }

  if (isMobile) score -= 2
  if (saveData || slowNet) score -= 2

  // Prefer speed/stability, but keep enough resolution for uncommon glyphs
  let maxSide: number
  if (score <= 0) maxSide = 1120
  else if (score <= 2) maxSide = 1280
  else if (score <= 4) maxSide = 1440
  else maxSide = 1600

  cachedMaxSide = maxSide
  return maxSide
}

/**
 * Resolve static asset URLs against the *page* (index.html), not the JS chunk.
 * With Vite `base: './'`, a bare `./ort/` would wrongly resolve to `/assets/ort/`
 * when ORT loads from a module under `/assets/`.
 */
function publicUrl(path: string): string {
  const clean = path.replace(/^\//, '')
  const { origin, pathname } = window.location
  const dir = pathname.endsWith('/')
    ? pathname
    : pathname.replace(/\/[^/]*$/, '/')
  return new URL(clean, `${origin}${dir}`).href
}

/** Shrink huge screenshots before OCR to keep mobile WASM usable */
async function downscaleForOcr(file: File): Promise<{
  input: Blob | HTMLCanvasElement
  previewUrl: string
  maxSide: number
}> {
  const previewUrl = URL.createObjectURL(file)
  const limit = getOcrMaxSide()
  const bitmap = await createImageBitmap(file)
  try {
    const maxSide = Math.max(bitmap.width, bitmap.height)
    if (maxSide <= limit) {
      return { input: file, previewUrl, maxSide: limit }
    }
    const scale = limit / maxSide
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return { input: file, previewUrl, maxSide: limit }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, w, h)
    return { input: canvas, previewUrl, maxSide: limit }
  } finally {
    bitmap.close()
  }
}

export async function getOcr(
  onProgress?: (msg: string) => void,
): Promise<PaddleOCRInstance> {
  if (!ocrPromise) {
    ocrPromise = (async () => {
      onProgress?.('正在加载识别引擎（手机上首次可能要一两分钟，请勿离开）…')
      const { PaddleOCR } = await import('@paddleocr/paddleocr-js')
      onProgress?.('正在初始化中文模型（首次较慢，请耐心等待）…')

      // det 继续用 tiny 保体积；rec 用 small，字表更大，生僻字更稳
      const ocr = await PaddleOCR.create({
        lang: 'ch',
        textDetectionModelName: 'PP-OCRv6_tiny_det',
        textRecognitionModelName: 'PP-OCRv6_small_rec',
        textDetectionModelAsset: {
          url: publicUrl('models/PP-OCRv6_tiny_det_onnx_infer.tar'),
        },
        textRecognitionModelAsset: {
          url: publicUrl('models/PP-OCRv6_small_rec_onnx_infer.tar'),
        },
        ortOptions: {
          backend: 'wasm',
          wasmPaths: publicUrl('ort/'),
          numThreads: 1,
          simd: true,
        },
      })
      onProgress?.('识别引擎就绪')
      return ocr as PaddleOCRInstance
    })().catch((err) => {
      ocrPromise = null
      throw err
    })
  }
  return ocrPromise
}

/** Warm up engine on the import page so upload doesn't hit cold start */
export function preloadOcr(onProgress?: (msg: string) => void): Promise<void> {
  return getOcr(onProgress).then(() => undefined)
}

function polyBounds(
  poly: Array<{ x: number; y: number } | number[]>,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const xs: number[] = []
  const ys: number[] = []
  for (const p of poly) {
    if (Array.isArray(p)) {
      xs.push(Number(p[0]))
      ys.push(Number(p[1]))
    } else {
      xs.push(p.x)
      ys.push(p.y)
    }
  }
  if (!xs.length) return null
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

export async function recognizePagesFromFiles(
  files: File[],
  onProgress?: (msg: string) => void,
): Promise<OcrPageResult[]> {
  const ocr = await getOcr(onProgress)
  const pages: OcrPageResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!
    onProgress?.(`正在按设备性能压缩第 ${i + 1}/${files.length} 张…`)
    const { input, previewUrl, maxSide } = await downscaleForOcr(file)
    onProgress?.(`正在识别第 ${i + 1}/${files.length} 张（最长边≤${maxSide}px）…`)
    const [result] = await ocr.predict(input)
    if (!result) {
      URL.revokeObjectURL(previewUrl)
      continue
    }
    const { width, height } = result.image
    const lines: OcrLine[] = []

    for (const item of result.items) {
      const bounds = polyBounds(item.poly)
      if (!bounds || width <= 0 || height <= 0) continue
      lines.push({
        text: item.text,
        score: item.score,
        minX: bounds.minX / width,
        maxX: bounds.maxX / width,
        minY: bounds.minY / height,
        maxY: bounds.maxY / height,
      })
    }

    onProgress?.(`正在从第 ${i + 1} 张里挑昵称…`)
    pages.push({
      id: `page-${Date.now()}-${i}`,
      fileName: file.name,
      imageUrl: previewUrl,
      boxes: buildOcrBoxes(lines),
    })
  }

  return pages
}
