import { buildOcrBoxes, type OcrBox, type OcrLine } from './nickname'

type PaddleOCRInstance = {
  predict: (input: Blob | File) => Promise<
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

/**
 * Resolve static asset URLs against the *page* (index.html), not the JS chunk.
 * With Vite `base: './'`, a bare `./ort/` would wrongly resolve to `/assets/ort/`
 * when ORT loads from a module under `/assets/`.
 */
function publicUrl(path: string): string {
  const clean = path.replace(/^\//, '')
  const { origin, pathname } = window.location
  // HashRouter: pathname is like /fan-lottery/ or /fan-lottery/index.html
  const dir = pathname.endsWith('/')
    ? pathname
    : pathname.replace(/\/[^/]*$/, '/')
  return new URL(clean, `${origin}${dir}`).href
}

export async function getOcr(
  onProgress?: (msg: string) => void,
): Promise<PaddleOCRInstance> {
  if (!ocrPromise) {
    ocrPromise = (async () => {
      onProgress?.('正在加载识别引擎…')
      const { PaddleOCR } = await import('@paddleocr/paddleocr-js')
      onProgress?.('正在加载本地中文模型…')

      const ocr = await PaddleOCR.create({
        lang: 'ch',
        textDetectionModelName: 'PP-OCRv6_tiny_det',
        textRecognitionModelName: 'PP-OCRv6_tiny_rec',
        textDetectionModelAsset: {
          url: publicUrl('models/PP-OCRv6_tiny_det_onnx_infer.tar'),
        },
        textRecognitionModelAsset: {
          url: publicUrl('models/PP-OCRv6_tiny_rec_onnx_infer.tar'),
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
    onProgress?.(`正在识别第 ${i + 1}/${files.length} 张…`)
    const [result] = await ocr.predict(file)
    if (!result) continue
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
      imageUrl: URL.createObjectURL(file),
      boxes: buildOcrBoxes(lines),
    })
  }

  return pages
}
