import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { buildAnnounceText, downloadAnnouncePng } from '../lib/announce'
import { useLottery } from '../store/LotteryContext'
import { MODE_LABELS } from '../types'

export function Result() {
  const nav = useNavigate()
  const {
    winners,
    records,
    pool,
    clearWinners,
    clearHistory,
    removeRecord,
    resetAll,
    mode,
    artistNames,
    announceRules,
    setAnnounceRules,
    undoLastDraw,
  } = useLottery()
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingRules, setEditingRules] = useState(false)

  const latest = records[0]
  const payload = useMemo(
    () => ({
      artistNames,
      winners,
      rules: announceRules,
      mode,
      latest,
    }),
    [artistNames, winners, announceRules, mode, latest],
  )

  const text = useMemo(() => buildAnnounceText(payload), [payload])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('请手动复制：', text)
    }
  }

  const savePoster = async () => {
    setSaving(true)
    try {
      await downloadAnnouncePng(payload)
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout
      step={5}
      title="中奖结果"
      footer={
        <>
          <button type="button" className="btn btn-primary btn-block" onClick={() => void copy()}>
            {copied ? '已复制' : '复制公示文案'}
          </button>
          <button
            type="button"
            className="btn btn-coral btn-block"
            disabled={!winners.length || saving}
            onClick={() => void savePoster()}
          >
            {saving ? '生成中…' : '保存公示图'}
          </button>
          {pool.length > 0 && (
            <button type="button" className="btn btn-soft btn-block" onClick={() => nav('/draw')}>
              继续补抽（池中还剩 {pool.length} 人）
            </button>
          )}
          {records.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => {
                if (confirm('撤销上一抽？中奖名单和历史会回滚，候选人会重新勾选。')) {
                  undoLastDraw()
                }
              }}
            >
              撤销上一抽
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => {
              if (confirm('开始全新一轮？中奖记录会保留在本机。')) {
                clearWinners()
                resetAll()
                nav('/setup')
              }
            }}
          >
            开始新一轮
          </button>
          <Link className="btn btn-ghost btn-block" to="/">
            回首页
          </Link>
        </>
      }
    >
      {winners.length === 0 ? (
        <p>还没有中奖者，请先去抽奖。</p>
      ) : (
        <div className="stack">
          <div className="winner-banner" style={{ background: '#fff4eb', borderRadius: 16, padding: 16 }}>
            <div className="muted">恭喜</div>
            <div className="name" style={{ fontSize: '1.5rem' }}>
              {winners.join('、')}
            </div>
            {latest?.drawId && (
              <div className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
                开奖编号 {latest.drawId} · {MODE_LABELS[latest.mode]}
              </div>
            )}
          </div>

          <div className="field">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <label htmlFor="rules">活动规则（写入文案/公示图）</label>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ minHeight: 32, padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => setEditingRules((v) => !v)}
              >
                {editingRules ? '收起' : '编辑'}
              </button>
            </div>
            {editingRules ? (
              <textarea
                id="rules"
                rows={3}
                value={announceRules}
                onChange={(e) => setAnnounceRules(e.target.value)}
              />
            ) : (
              <p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                {announceRules}
              </p>
            )}
          </div>

          <h2 style={{ fontSize: '1.2rem', marginTop: 8 }}>兑奖清单</h2>
          <ol className="checklist">
            <li>
              <span className="num">1</span>
              <span>私信或评论通知中奖粉丝</span>
            </li>
            <li>
              <span className="num">2</span>
              <span>请对方发至少一个平台「已关注你」的截图</span>
            </li>
            <li>
              <span className="num">3</span>
              <span>核对通过后，在米画师开橱窗给对方拍下</span>
            </li>
          </ol>
        </div>
      )}

      {records.length > 0 && (
        <div className="stack" style={{ marginTop: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>本机历史</h2>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              onClick={() => {
                if (confirm('清空本机抽奖历史和当前中奖名单？名单池不会动。')) {
                  clearHistory()
                }
              }}
            >
              清空历史
            </button>
          </div>
          {records.slice(0, 8).map((r) => (
            <div key={r.id} className="list-item" style={{ gridTemplateColumns: '1fr auto' }}>
              <div>
                <strong>{r.winners.join('、')}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  {new Date(r.createdAt).toLocaleString()} · {MODE_LABELS[r.mode]} ·{' '}
                  {r.drawId ?? '—'} · 池 {r.poolSize} 人
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ minHeight: 36, padding: '6px 10px' }}
                onClick={() => {
                  if (confirm(`删除这条历史？\n${r.winners.join('、')}`)) {
                    removeRecord(r.id)
                  }
                }}
              >
                删
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
