import { MODE_LABELS, type ArtistNames, type LotteryMode, type LotteryRecord } from '../types'

export type StickerPreset = 'sm' | 'md' | 'lg'

/** 贴图在公示图上的布局（相对坐标 0～1） */
export interface PosterSticker {
  id: string
  /** object URL 或 data URL */
  src: string
  /** 中心点 X（相对画布宽） */
  x: number
  /** 中心点 Y（相对画布高） */
  y: number
  /** 贴图宽度占画布宽的比例 */
  widthRatio: number
}

export const STICKER_PRESET_RATIO: Record<StickerPreset, number> = {
  sm: 0.16,
  lg: 0.4,
  md: 0.26,
}

export interface AnnouncePayload {
  artistNames: ArtistNames
  winners: string[]
  rules: string
  mode: LotteryMode
  latest?: LotteryRecord
  stickers?: PosterSticker[]
}

export function artistDisplayName(names: ArtistNames): string {
  return names.bilibili || names.xiaohongshu || names.douyin || '画师'
}

export function buildAnnounceText(p: AnnouncePayload): string {
  const when = p.latest
    ? new Date(p.latest.createdAt).toLocaleString()
    : new Date().toLocaleString()
  const drawId = p.latest?.drawId ?? '—'
  const mode = MODE_LABELS[p.latest?.mode ?? p.mode]
  const lines = [
    '【粉丝橱窗抽奖结果】',
    `画师：${artistDisplayName(p.artistNames)}`,
    `时间：${when}`,
    `方式：${mode}`,
    `开奖编号：${drawId}`,
    `中奖：${p.winners.join('、') || '（暂无）'}`,
    '',
    p.rules.trim() || '兑奖请提供至少一个平台「已关注」截图，核对后开橱窗。',
    '',
    `本机加密随机 · 开奖编号 ${drawId}`,
  ]
  return lines.join('\n')
}

export function measureAnnouncePoster(p: AnnouncePayload): { width: number; height: number } {
  const width = 720
  const pad = 40
  const winners = p.winners.length ? p.winners : ['（暂无）']
  const lineH = 42
  const titleH = 72
  const subH = 36
  const winnerBlock = winners.length * lineH + 24
  const rulesH = 90
  const footH = 70
  const height = pad * 2 + titleH + subH * 3 + winnerBlock + rulesH + footH
  return { width, height }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('贴图加载失败'))
    img.src = src
  })
}

/** Draw a shareable announcement poster onto a canvas (含可选贴图). */
export async function renderAnnouncePoster(
  canvas: HTMLCanvasElement,
  p: AnnouncePayload,
): Promise<void> {
  const { width, height } = measureAnnouncePoster(p)
  const pad = 40
  const winners = p.winners.length ? p.winners : ['（暂无）']
  const lineH = 42
  const rules = (p.rules.trim() || '兑奖请提供关注截图。').slice(0, 120)
  const when = p.latest
    ? new Date(p.latest.createdAt).toLocaleString()
    : new Date().toLocaleString()
  const drawId = p.latest?.drawId ?? '—'

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, '#e7f6f1')
  grad.addColorStop(0.55, '#ffffff')
  grad.addColorStop(1, '#fff4eb')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#2a9d8f'
  fillRoundRect(ctx, pad - 12, pad - 12, width - (pad - 12) * 2, height - (pad - 12) * 2, 28)
  ctx.fillStyle = '#ffffff'
  fillRoundRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 22)

  let y = pad + 36
  ctx.fillStyle = '#1f7a6f'
  ctx.font = "700 36px 'ZCOOL KuaiLe', 'PingFang SC', 'Microsoft YaHei', sans-serif"
  ctx.fillText('粉丝橱窗抽奖公示', pad + 28, y)
  y += 48

  ctx.fillStyle = '#5c6b70'
  ctx.font = "500 18px 'PingFang SC', 'Microsoft YaHei', sans-serif"
  ctx.fillText(`画师 · ${artistDisplayName(p.artistNames)}`, pad + 28, y)
  y += 28
  ctx.fillText(`时间 · ${when}`, pad + 28, y)
  y += 28
  ctx.fillText(`开奖编号 · ${drawId}`, pad + 28, y)
  y += 40

  ctx.fillStyle = '#1f2a2e'
  ctx.font = "700 22px 'PingFang SC', 'Microsoft YaHei', sans-serif"
  ctx.fillText('中奖名单', pad + 28, y)
  y += 36

  ctx.font = "600 26px 'ZCOOL KuaiLe', 'PingFang SC', 'Microsoft YaHei', sans-serif"
  ctx.fillStyle = '#e76f51'
  for (const name of winners) {
    ctx.fillText(name, pad + 28, y)
    y += lineH
  }

  y += 12
  ctx.fillStyle = '#5c6b70'
  ctx.font = "400 16px 'PingFang SC', 'Microsoft YaHei', sans-serif"
  wrapText(ctx, rules, pad + 28, y, width - pad * 2 - 56, 24)

  ctx.fillStyle = '#2a9d8f'
  ctx.font = "500 15px 'PingFang SC', 'Microsoft YaHei', sans-serif"
  ctx.fillText('本机加密随机抽取 · 结果仅存于本机', pad + 28, height - pad - 18)

  const stickers = p.stickers ?? []
  for (const s of stickers) {
    try {
      const img = await loadImage(s.src)
      const w = Math.max(24, width * s.widthRatio)
      const aspect = img.naturalHeight / Math.max(1, img.naturalWidth)
      const h = w * aspect
      const dx = s.x * width - w / 2
      const dy = s.y * height - h / 2
      ctx.drawImage(img, dx, dy, w, h)
    } catch {
      // skip broken sticker
    }
  }
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
  ctx.fill()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const chars = [...text]
  let line = ''
  let yy = y
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy)
      line = ch
      yy += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, yy)
}

export async function downloadAnnouncePng(
  p: AnnouncePayload,
  filename = 'fan-lottery-announce.png',
): Promise<void> {
  const canvas = document.createElement('canvas')
  await renderAnnouncePoster(canvas, p)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  )
  if (!blob) throw new Error('无法生成公示图')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function createStickerFromFile(
  file: File,
  preset: StickerPreset = 'md',
): Promise<PosterSticker> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'))
      return
    }
    const src = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({
        id: `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        src,
        x: 0.78,
        y: 0.28,
        widthRatio: STICKER_PRESET_RATIO[preset],
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(src)
      reject(new Error('图片无法读取'))
    }
    img.src = src
  })
}
