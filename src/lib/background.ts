const KEY = 'fan-lottery-bg-v1'

export interface BgSettings {
  /** 用户是否手动调过（为 true 时不再跟断点默认走） */
  customized: boolean
  /** 自定义图 data URL；null 用内置插画 */
  imageDataUrl: string | null
  /** background-size: auto ${zoom}% */
  zoom: number
  posX: number
  posY: number
}

export function defaultBgForViewport(width = window.innerWidth): Omit<BgSettings, 'customized' | 'imageDataUrl'> {
  // 人物约在插画中下部：用接近 50%～60% 的 Y，让小人落在视口中央
  if (width >= 1440) return { zoom: 165, posX: 50, posY: 56 }
  if (width >= 1024) return { zoom: 155, posX: 50, posY: 58 }
  if (width >= 720) return { zoom: 152, posX: 50, posY: 58 }
  return { zoom: 150, posX: 50, posY: 58 }
}

export function loadBgSettings(): BgSettings {
  const base = defaultBgForViewport()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      return { customized: false, imageDataUrl: null, ...base }
    }
    const parsed = JSON.parse(raw) as Partial<BgSettings>
    return {
      customized: Boolean(parsed.customized),
      imageDataUrl: typeof parsed.imageDataUrl === 'string' ? parsed.imageDataUrl : null,
      zoom: clamp(Number(parsed.zoom) || base.zoom, 100, 280),
      posX: clamp(Number(parsed.posX) ?? base.posX, 0, 100),
      posY: clamp(Number(parsed.posY) ?? base.posY, 0, 100),
    }
  } catch {
    return { customized: false, imageDataUrl: null, ...base }
  }
}

export function saveBgSettings(settings: BgSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // 图太大时可能超配额：去掉图再试一次
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ ...settings, imageDataUrl: null }),
      )
      alert('图片太大，本机存不下。已保留缩放和位置，请换一张更小的图。')
    } catch {
      // ignore
    }
  }
}

export function resolveBgView(settings: BgSettings, width = window.innerWidth): BgSettings {
  if (settings.customized) return settings
  return {
    ...settings,
    ...defaultBgForViewport(width),
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** 压缩到可塞进 localStorage 的 JPEG data URL */
export function fileToBgDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const maxSide = 1600
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法处理图片'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片无法读取'))
    }
    img.src = url
  })
}
