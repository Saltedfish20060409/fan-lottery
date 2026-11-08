import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { isNicknameCandidate } from '../lib/nickname'
import { useLottery } from '../store/LotteryContext'

export function Pick() {
  const nav = useNavigate()
  const { ocrPages, toggleOcrBox, commitOcrSelection } = useLottery()
  const [pageIndex, setPageIndex] = useState(0)

  const page = ocrPages[pageIndex]

  const selectedCount = useMemo(
    () => ocrPages.reduce((n, p) => n + p.boxes.filter((b) => b.selected).length, 0),
    [ocrPages],
  )

  const pageSelected = page?.boxes.filter((b) => b.selected).length ?? 0

  if (!ocrPages.length) {
    return <Navigate to="/import" replace />
  }

  if (!page) {
    return <Navigate to="/import" replace />
  }

  const onConfirm = () => {
    commitOcrSelection()
    nav('/review')
  }

  // 默认只露出「像昵称」的左栏短框；正文类一律隐藏，减少误点
  const tappable = page.boxes.filter((b) => {
    if (b.selected || b.suggested) return true
    if (!isNicknameCandidate(b.text)) return false
    const w = b.maxX - b.minX
    return b.minX < 0.48 && w < 0.4 && b.text.length <= 10
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
        绿色是自动猜的昵称（已尽量避开评论正文）。点错取消，漏了点头像旁名字。下一页可改字；生僻字若缺字，对照截图手改即可。
      </p>

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
