import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { looksLikeTrailingBadgeJunk } from '../lib/nickname'
import { useLottery } from '../store/LotteryContext'
import { PLATFORM_LABELS, type SourcePlatform } from '../types'

export function Review() {
  const nav = useNavigate()
  const {
    candidates,
    updateCandidate,
    removeCandidate,
    setAllSelected,
    setSelectedPlatform,
    clearCandidates,
    addManual,
    pool,
    drawCount,
  } = useLottery()
  const [manual, setManual] = useState('')
  const [batchPlatform, setBatchPlatform] = useState<SourcePlatform>('unknown')

  const onAdd = () => {
    if (!manual.trim()) return
    addManual(manual)
    setManual('')
  }

  return (
    <Layout
      step={3}
      title="核对抽奖名单"
      footer={
        <>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={pool.length === 0}
            onClick={() => nav('/draw')}
          >
            去抽奖（已选 {pool.length} 人，抽 {drawCount} 名）
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => nav('/import')}>
            返回继续导入
          </button>
        </>
      }
    >
      <p>
        点名字可改字。生僻字缺字请对照截图手改。
      </p>
      <p className="muted" style={{ fontSize: '0.88rem' }}>
        <strong style={{ color: 'var(--ink)' }}>权重</strong>
        ：开启「按权重抽取」时，数字越大越容易被抽中。每人默认是 1（机会相同）；若某粉丝评论很多次想多给机会，可把权重改成
        2、3…
      </p>

      <div className="row">
        <span className="chip">已选 {pool.length}</span>
        <span className="chip">合计 {candidates.length}</span>
      </div>

      <div className="row">
        <button type="button" className="btn btn-soft" style={{ minHeight: 40 }} onClick={() => setAllSelected(true)}>
          全选
        </button>
        <button type="button" className="btn btn-ghost" style={{ minHeight: 40 }} onClick={() => setAllSelected(false)}>
          全不选
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ minHeight: 40, color: '#c45d43' }}
          onClick={() => {
            if (confirm('清空全部名单？')) clearCandidates()
          }}
        >
          清空
        </button>
      </div>

      <div className="row" style={{ alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: '0.9rem' }}>
          已选项批量改平台
        </span>
        <select
          value={batchPlatform}
          onChange={(e) => setBatchPlatform(e.target.value as SourcePlatform)}
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
        <button
          type="button"
          className="btn btn-soft"
          style={{ minHeight: 40 }}
          onClick={() => setSelectedPlatform(batchPlatform)}
        >
          应用到已选
        </button>
      </div>

      <div className="list">
        {candidates.length === 0 && (
          <p className="muted">还没有人，请先回去上传截图或粘贴昵称。</p>
        )}
        {candidates.map((c) => (
          <div key={c.id} className={`list-item ${c.lowConfidence ? 'low' : ''}`}>
            <input
              type="checkbox"
              checked={c.selected}
              onChange={(e) => updateCandidate(c.id, { selected: e.target.checked })}
              aria-label={`选择 ${c.name}`}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                value={c.name}
                onChange={(e) => updateCandidate(c.id, { name: e.target.value })}
                style={{
                  border: 'none',
                  background: 'transparent',
                  width: '100%',
                  padding: 0,
                  fontWeight: 600,
                }}
              />
              <div className="muted" style={{ fontSize: '0.78rem' }}>
                {c.lowConfidence ? '需确认 · ' : ''}
                {c.source === 'ocr' ? '截图识别' : c.source === 'paste' ? '粘贴' : '手动'}
                {` · ${PLATFORM_LABELS[c.sourcePlatform ?? 'unknown']}`}
                {c.count > 1 ? ` · 出现 ${c.count} 次` : ''}
                {c.strippedSuffix
                  ? ` · 已去掉疑似等级「${c.strippedSuffix}」`
                  : looksLikeTrailingBadgeJunk(c.name)
                    ? ' · 末尾字符可能是等级图标'
                    : ''}
              </div>
              <div className="row" style={{ alignItems: 'center', marginTop: 4, gap: 8 }}>
                <label className="muted" style={{ fontSize: '0.8rem' }}>
                  权重
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={c.weight ?? 1}
                  onChange={(e) =>
                    updateCandidate(c.id, {
                      weight: Math.max(1, Math.min(999, Math.floor(Number(e.target.value)) || 1)),
                    })
                  }
                  style={{
                    width: 64,
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    padding: '4px 8px',
                  }}
                />
              </div>
              {c.rawName && c.rawName !== c.name && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 32, padding: '4px 8px', marginTop: 4, fontSize: '0.8rem' }}
                  onClick={() =>
                    updateCandidate(c.id, {
                      name: c.rawName!,
                      strippedSuffix: undefined,
                      lowConfidence: false,
                    })
                  }
                >
                  恢复原文「{c.rawName}」
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ minHeight: 36, padding: '6px 10px' }}
              onClick={() => removeCandidate(c.id)}
            >
              删
            </button>
          </div>
        ))}
      </div>

      <div className="row" style={{ alignItems: 'stretch' }}>
        <input
          placeholder="漏了谁？手动补昵称"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          style={{
            flex: 1,
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '12px 14px',
          }}
        />
        <button type="button" className="btn btn-soft" onClick={onAdd}>
          添加
        </button>
      </div>
    </Layout>
  )
}
