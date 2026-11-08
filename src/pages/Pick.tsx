import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { guessPlatformFromTexts } from '../lib/platform'
import { isAnyOcrTextBox, isTappableOcrBox } from '../lib/nickname'
import { useLottery } from '../store/LotteryContext'
import { PLATFORM_LABELS, type SourcePlatform } from '../types'

export function Pick() {
  const nav = useNavigate()
  const { ocrPages, toggleOcrBox, commitOcrSelection, importPlatform, setImportPlatform } =
    useLottery()
  const [pageIndex, setPageIndex] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const [platformGuessed, setPlatformGuessed] = useState(false)

  const page = ocrPages[pageIndex]

  const selectedCount = useMemo(
    () => ocrPages.reduce((n, p) => n + p.boxes.filter((b) => b.selected).length, 0),
    [ocrPages],
  )

  const pageSelected = page?.boxes.filter((b) => b.selected).length ?? 0

  // 弱猜测：仅在仍是 unknown 时预填一次
  useEffect(() => {
    if (platformGuessed || !ocrPages.length) return
    if (importPlatform !== 'unknown') {
      setPlatformGuessed(true)
      return
    }
    const texts = ocrPages.flatMap((p) => p.boxes.map((b) => b.rawText || b.text))
    const guess = guessPlatformFromTexts(texts)
    if (guess !== 'unknown') setImportPlatform(guess)
    setPlatformGuessed(true)
  }, [ocrPages, importPlatform, platformGuessed, setImportPlatform])

  if (!ocrPages.length) {
    return <Navigate to="/import" replace />
  }

  if (!page) {
    return <Navigate to="/import" replace />
  }

  const onConfirm = () => {
    commitOcrSelection(importPlatform)
    nav('/review')
  }

  const tappable = page.boxes.filter((b) => {
    if (b.selected || b.suggested) return true
    if (showAll) return isAnyOcrTextBox(b.text) || isAnyOcrTextBox(b.rawText)
    return isTappableOcrBox(b)
  })

  return (
    <Layout
      step={2}
      title="点出昵称"
      footer={
        <>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={pageIndex <= 0}
              onClick={() => setPageIndex((i) => i - 1)}
            >
              上一张
            </button>
            <span className="chip">
              {pageIndex + 1}/{ocrPages.length} · 本张 {pageSelected} 个
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={pageIndex >= ocrPages.length - 1}
              onClick={() => setPageIndex((i) => i + 1)}
            >
              下一张
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={selectedCount === 0}
            onClick={onConfirm}
          >
            确认昵称（共 {selectedCount} 个）
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => nav('/import')}>
            返回重新导入
          </button>
        </>
      }
    >
      <p>
        绿色是按位置自动猜的昵称。点错取消；漏了就点头像旁的名字。可打开「显示全部文字框」找漏网的。
      </p>

      <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <label className="row" style={{ alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          <span>显示全部文字框</span>
        </label>
        <label className="row" style={{ alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ fontSize: '0.9rem' }}>
            本批平台
          </span>
          <select
            value={importPlatform}
            onChange={(e) => setImportPlatform(e.target.value as SourcePlatform)}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: '8px 10px',
              background: '#fff',
            }}
          >
            {(Object.keys(PLATFORM_LABELS) as SourcePlatform[]).map((k) => (
              <option key={k} value={k}>
                {PLATFORM_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="picker-frame">
        <img src={page.imageUrl} alt={page.fileName} className="picker-image" draggable={false} />
        {tappable.map((box) => {
          const top = `${box.minY * 100}%`
          const left = `${box.minX * 100}%`
          const width = `${Math.max(4, (box.maxX - box.minX) * 100)}%`
          const height = `${Math.max(2.2, (box.maxY - box.minY) * 100)}%`
          return (
            <button
              key={box.id}
              type="button"
              className={`picker-box ${box.selected ? 'selected' : ''} ${box.suggested ? 'suggested' : ''}`}
              style={{ top, left, width, height }}
              title={
                box.strippedSuffix
                  ? `原文 ${box.rawText}（已去掉疑似等级「${box.strippedSuffix}」）`
                  : box.text
              }
              onClick={() => toggleOcrBox(page.id, box.id)}
            >
              <span>{box.text}</span>
            </button>
          )
        })}
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <div className="muted" style={{ fontSize: '0.85rem' }}>
          本张已选：
        </div>
        <div className="row">
          {page.boxes.filter((b) => b.selected).length === 0 && (
            <span className="muted">还没选昵称，请点截图里的名字</span>
          )}
          {page.boxes
            .filter((b) => b.selected)
            .map((b) => (
              <button
                key={b.id}
                type="button"
                className="chip"
                style={{ border: 'none', cursor: 'pointer' }}
                onClick={() => toggleOcrBox(page.id, b.id)}
              >
                {b.text} ×
              </button>
            ))}
        </div>
      </div>
    </Layout>
  )
}
