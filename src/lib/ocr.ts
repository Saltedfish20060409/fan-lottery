import { buildOcrBoxes, type OcrBox, type OcrLine } from './nickname'

export interface OcrPageResult {
  id: string
  fileName: string
  imageUrl: string
  boxes: OcrBox[]
}

type ServerOcrItem = {
  text: string
  rawText?: string
  strippedSuffix?: string | null
  score: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type ServerOcrResponse = {
  width: number
  height: number
  elapsedMs?: number
  items: ServerOcrItem[]
}

const DEFAULT_API = 'https://vnscriptstudio.cn/fan-lottery-ocr'
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
/** 评论截图缩到这个边长足够认昵称，显著减少上传与 CPU OCR 时间 */
const CLIENT_MAX_SIDE = 1440
const JPEG_QUALITY = 0.85

function apiBase(): string {
  const raw = (import.meta.env.VITE_OCR_API_BASE as string | undefined)?.trim()
  return (raw || DEFAULT_API).replace(/\/$/, '')
}

async function prepareUpload(file: File): Promise<{ blob: Blob; previewUrl: string }> {
  const previewUrl = URL.createObjectURL(file)
  const bitmap = await createImageBitmap(file)
  try {
    const maxSide = Math.max(bitmap.width, bitmap.height)
    const scale = Math.min(1, CLIENT_MAX_SIDE / maxSide)
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    // PNG 截图即便不大也转 JPEG，上传更快
    const shouldReencode =
      scale < 1 ||
      file.size > 450_000 ||
      !/^image\/jpe?g$/i.test(file.type)

    if (!shouldReencode && file.size <= MAX_UPLOAD_BYTES) {
      return { blob: file, previewUrl }
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return { blob: file, previewUrl }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY),
    )
    return { blob: blob ?? file, previewUrl }
  } finally {
    bitmap.close()
  }
}

function mergeServerMeta(boxes: OcrBox[], items: ServerOcrItem[]): OcrBox[] {
  const byRaw = new Map<string, ServerOcrItem>()
  for (const it of items) {
    const key = (it.rawText || it.text).replace(/\s+/g, '')
    if (key) byRaw.set(key, it)
  }

  return boxes.map((box) => {
    const hit = byRaw.get(box.rawText) || byRaw.get(box.text)
    if (!hit) {
      // No server meta: keep layout suggestion only if score already high
      const ok = box.score >= 0.7
      return {
        ...box,
        suggested: box.suggested && ok,
        selected: box.selected && ok,
      }
    }
    const ok = hit.score >= 0.7
    const suggested = box.suggested && ok
    return {
      ...box,
      text: hit.text || box.text,
      rawText: hit.rawText || box.rawText,
      strippedSuffix: hit.strippedSuffix || undefined,
      score: hit.score,
      suggested,
      selected: suggested,
    }
  })
}

async function recognizeOne(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<OcrPageResult | null> {
  onProgress?.('正在压缩并上传截图（图不落盘）…')
  const { blob, previewUrl } = await prepareUpload(file)
  const form = new FormData()
  form.append('file', blob, file.name || 'screenshot.jpg')

  onProgress?.('正在服务端识别昵称…')
  const res = await fetch(`${apiBase()}/recognize`, { method: 'POST', body: form })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = (await res.json()) as { detail?: string }
      if (j.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
    } catch {
      // ignore
    }
    URL.revokeObjectURL(previewUrl)
    throw new Error(detail)
  }

  const data = (await res.json()) as ServerOcrResponse
  const lines: OcrLine[] = (data.items || []).map((it) => ({
    // Feed raw into layout cleaner so client heuristics still apply
    text: it.rawText || it.text,
    score: it.score,
    minX: it.minX,
    maxX: it.maxX,
    minY: it.minY,
    maxY: it.maxY,
  }))

  onProgress?.('正在从识别结果里挑昵称…')
  const boxes = mergeServerMeta(buildOcrBoxes(lines), data.items || [])

  return {
    id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fileName: file.name,
    imageUrl: previewUrl,
    boxes,
  }
}

/** Health-check the OCR API (replaces WASM preload). */
export async function preloadOcr(onProgress?: (msg: string) => void): Promise<void> {
  onProgress?.('正在连接识别服务…')
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(`${apiBase()}/health`, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`识别服务不可用（HTTP ${res.status}）`)
    const j = (await res.json()) as { ok?: boolean; ocrReady?: boolean }
    if (!j.ok) throw new Error('识别服务未就绪')
    onProgress?.(
      j.ocrReady
        ? '识别服务已就绪，可以上传截图了'
        : '识别服务已连接（模型可能仍在预热，首张会稍慢）',
    )
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('连接识别服务超时，请检查网络后重试，或改用下方粘贴昵称')
    }
    throw e
  } finally {
    window.clearTimeout(timer)
  }
}

export async function recognizePagesFromFiles(
  files: File[],
  onProgress?: (msg: string) => void,
): Promise<OcrPageResult[]> {
  const pages: OcrPageResult[] = []
  for (let i = 0; i < files.length; i++) {
    onProgress?.(`正在识别第 ${i + 1}/${files.length} 张…`)
    const page = await recognizeOne(files[i]!, onProgress)
    if (page) pages.push(page)
  }
  return pages
}
