import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { looksLikeTrailingBadgeJunk } from '../lib/nickname'
import { useLottery } from '../store/LotteryContext'

export function Review() {
  const nav = useNavigate()
  const {
    candidates,
    updateCandidate,
    removeCandidate,
    setAllSelected,
    clearCandidates,
    addManual,
    pool,
    drawCount,
    artistNames,
    refilterArtists,
  } = useLottery()
  const [manual, setManual] = useState('')

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
        最后再核对一遍：点名字就能改字。生僻字若显示成空白或缺字，请对照截图手改；末尾若被当成等级图标误删，可点「恢复原文」。
      </p>

      <div className="row">
        <span className="chip">已选 {pool.length}</span>
        <span className="chip">合计 {candidates.length}</span>
        {(artistNames.bilibili || artistNames.xiaohongshu || artistNames.douyin) && (
          <button type="button" className="btn btn-ghost" style={{ minHeight: 36, padding: '6px 12px' }} onClick={refilterArtists}>
            再排除本人
          </button>
        )}
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
                {c.count > 1 ? ` · 出现 ${c.count} 次` : ''}
                {c.strippedSuffix
                  ? ` · 已去掉疑似等级「${c.strippedSuffix}」`
                  : looksLikeTrailingBadgeJunk(c.name)
                    ? ' · 末尾字符可能是等级图标'
                    : ''}
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
