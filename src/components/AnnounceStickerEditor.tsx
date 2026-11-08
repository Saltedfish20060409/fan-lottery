import { useEffect, useRef, useState } from 'react'
import {
  createStickerFromFile,
  measureAnnouncePoster,
  renderAnnouncePoster,
  STICKER_PRESET_RATIO,
  type AnnouncePayload,
  type PosterSticker,
  type StickerPreset,
} from '../lib/announce'

type DragState = {
  id: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  origX: number
  origY: number
  origRatio: number
}

export function AnnounceStickerEditor({
  payload,
  stickers,
  onChange,
}: {
  payload: AnnouncePayload
  stickers: PosterSticker[]
  onChange: (next: PosterSticker[]) => void
}) {
  const [baseUrl, setBaseUrl] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [preset, setPreset] = useState<StickerPreset>('md')
  const [error, setError] = useState('')
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { width: logicalW, height: logicalH } = measureAnnouncePoster(payload)
  const selected = stickers.find((s) => s.id === selectedId) ?? null

  const { artistNames, winners, rules, mode, latest } = payload

  // 底图不含贴图，贴图用 HTML 叠加以便拖拽
  useEffect(() => {
    let cancelled = false
    const canvas = document.createElement('canvas')
    void renderAnnouncePoster(canvas, {
      artistNames,
      winners,
      rules,
      mode,
      latest,
      stickers: [],
    }).then(() => {
      if (cancelled) return
      canvas.toBlob((blob) => {
        if (!blob || cancelled) return
        const url = URL.createObjectURL(blob)
        setBaseUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      }, 'image/png')
    })
    return () => {
      cancelled = true
    }
  }, [artistNames, winners, rules, mode, latest])

  useEffect(() => {
    return () => {
      if (baseUrl) URL.revokeObjectURL(baseUrl)
    }
  }, [baseUrl])

  const onPickFile = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setError('')
    try {
      const sticker = await createStickerFromFile(file, preset)
      onChange([...stickers, sticker])
      setSelectedId(sticker.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const updateSticker = (id: string, patch: Partial<PosterSticker>) => {
    onChange(stickers.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const removeSelected = () => {
    if (!selectedId) return
    onChange(stickers.filter((s) => s.id !== selectedId))
    setSelectedId(null)
  }

  const applyPreset = (p: StickerPreset) => {
    setPreset(p)
    if (selectedId) updateSticker(selectedId, { widthRatio: STICKER_PRESET_RATIO[p] })
  }

  const onPointerDown = (
    e: React.PointerEvent,
    id: string,
    mode: 'move' | 'resize',
  ) => {
    e.preventDefault()
    e.stopPropagation()
    const s = stickers.find((x) => x.id === id)
    if (!s) return
    setSelectedId(id)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: s.x,
      origY: s.y,
      origRatio: s.widthRatio,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const el = stageRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    if (drag.mode === 'move') {
      const dx = (e.clientX - drag.startX) / rect.width
      const dy = (e.clientY - drag.startY) / rect.height
      updateSticker(drag.id, {
        x: Math.min(0.95, Math.max(0.05, drag.origX + dx)),
        y: Math.min(0.95, Math.max(0.05, drag.origY + dy)),
      })
    } else {
      const dx = (e.clientX - drag.startX) / rect.width
      updateSticker(drag.id, {
        widthRatio: Math.min(0.7, Math.max(0.08, drag.origRatio + dx * 1.2)),
      })
    }
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  return (
    <div className="stack sticker-editor">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>贴图（可选）</h2>
        <button
          type="button"
          className="btn btn-soft"
          style={{ minHeight: 36, padding: '6px 12px' }}
          onClick={() => fileRef.current?.click()}
        >
          导入图片
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void onPickFile(e.target.files)}
        />
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        可加表情包/自拍等。点选后拖动改位置，右下角拖动或用大中小改尺寸。
      </p>

      <div className="row">
        {(['sm', 'md', 'lg'] as StickerPreset[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`btn ${preset === p ? 'btn-primary' : 'btn-ghost'}`}
            style={{ minHeight: 36, padding: '6px 14px' }}
            onClick={() => applyPreset(p)}
          >
            {p === 'sm' ? '小' : p === 'md' ? '中' : '大'}
          </button>
        ))}
        {selected && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 36, padding: '6px 12px', color: '#c45d43' }}
            onClick={removeSelected}
          >
            删除选中
          </button>
        )}
      </div>

      {selected && (
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: '0.82rem' }}>
            微调大小
          </span>
          <input
            type="range"
            min={8}
            max={70}
            value={Math.round(selected.widthRatio * 100)}
            onChange={(e) =>
              updateSticker(selected.id, {
                widthRatio: Number(e.target.value) / 100,
              })
            }
          />
        </label>
      )}

      {error && (
        <div className="progress" style={{ background: '#ffe8e1', color: '#c45d43' }}>
          {error}
        </div>
      )}

      <div
        ref={stageRef}
        className="sticker-stage"
        style={{ aspectRatio: `${logicalW} / ${logicalH}` }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => setSelectedId(null)}
      >
        {baseUrl ? (
          <img src={baseUrl} alt="公示图预览" className="sticker-base" draggable={false} />
        ) : (
          <div className="muted" style={{ padding: 24, textAlign: 'center' }}>
            预览生成中…
          </div>
        )}
        {stickers.map((s) => {
          const wPct = s.widthRatio * 100
          const active = s.id === selectedId
          return (
            <div
              key={s.id}
              className={`sticker-item ${active ? 'active' : ''}`}
              style={{
                left: `${s.x * 100}%`,
                top: `${s.y * 100}%`,
                width: `${wPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onPointerDown={(e) => onPointerDown(e, s.id, 'move')}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedId(s.id)
              }}
            >
              <img src={s.src} alt="" draggable={false} />
              {active && (
                <button
                  type="button"
                  className="sticker-handle"
                  aria-label="拖动调整大小"
                  onPointerDown={(e) => onPointerDown(e, s.id, 'resize')}
                />
              )}
            </div>
          )
        })}
      </div>

      {stickers.length === 0 && (
        <p className="muted" style={{ fontSize: '0.82rem', textAlign: 'center' }}>
          还没有贴图。点「导入图片」添加，保存公示图时会一起画进去。
        </p>
      )}
    </div>
  )
}
