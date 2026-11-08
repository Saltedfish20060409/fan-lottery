import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cards } from '../components/lottery/Cards'
import { Gacha } from '../components/lottery/Gacha'
import { Lots } from '../components/lottery/Lots'
import { Roulette } from '../components/lottery/Roulette'
import { Slot } from '../components/lottery/Slot'
import { useLottery } from '../store/LotteryContext'
import { MODE_LABELS } from '../types'

/** 抽奖组件基准边长（与 .lottery-stage 视觉尺寸大致对应） */
const BASE = 300

export function Stage() {
  const { mode, drawPool, pool, drawCount, runDraw, winners } = useLottery()
  const [spinning, setSpinning] = useState(false)
  const [roundWinners, setRoundWinners] = useState<string[]>([])
  const [stagePool, setStagePool] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [scale, setScale] = useState(1.6)
  const spinTimer = useRef<number | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  const available = drawPool
  const displayPool = stagePool.length ? stagePool : available.length ? available : pool
  const canDraw = available.length > 0 && !spinning

  useEffect(() => {
    const update = () => {
      const el = mainRef.current
      const w = el?.clientWidth ?? window.innerWidth
      const h = el?.clientHeight ?? window.innerHeight * 0.6
      const target = Math.min(w * 0.92, h * 0.92)
      setScale(Math.max(1.35, Math.min(3.6, target / BASE)))
    }
    update()
    window.addEventListener('resize', update)
    const ro = elResize(mainRef.current, update)
    return () => {
      window.removeEventListener('resize', update)
      ro?.disconnect()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (spinTimer.current !== null) window.clearTimeout(spinTimer.current)
    }
  }, [])

  const start = () => {
    if (!canDraw) return
    const snapshot = [...available]
    const picked = runDraw()
    if (!picked.length) return
    if (spinTimer.current !== null) window.clearTimeout(spinTimer.current)
    setStagePool(snapshot)
    setRoundWinners(picked)
    setDone(false)
    setSpinning(true)
    const ms =
      mode === 'roulette' ? 4200 : mode === 'slot' ? 2400 : mode === 'cards' ? 2000 : 1800
    spinTimer.current = window.setTimeout(() => {
      setSpinning(false)
      setDone(true)
      spinTimer.current = null
    }, ms)
  }

  return (
    <div className="stage-shell">
      <div className="stage-top">
        <div>
          <div className="muted">投屏 · {MODE_LABELS[mode]}</div>
          <h1 className="display stage-title">粉丝橱窗抽奖</h1>
        </div>
        <div className="row stage-actions">
          <Link className="btn btn-ghost" to="/draw">
            返回
          </Link>
          {done && (
            <Link className="btn btn-soft" to="/result">
              查看结果
            </Link>
          )}
          <button
            type="button"
            className="btn btn-coral"
            disabled={!canDraw}
            onClick={start}
            style={{ minWidth: 148 }}
          >
            {spinning ? '抽取中…' : `开抽 ${drawCount} 人`}
          </button>
        </div>
      </div>

      <div className="stage-main" ref={mainRef}>
        <div
          className="stage-scale-wrap"
          style={{
            width: BASE * scale,
            height: BASE * scale,
          }}
        >
          <div
            className="stage-scale-inner"
            style={{
              width: BASE,
              height: BASE,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            {mode === 'roulette' && (
              <Roulette pool={displayPool} winners={roundWinners} spinning={spinning} />
            )}
            {mode === 'gacha' && <Gacha winners={roundWinners} spinning={spinning} />}
            {mode === 'slot' && (
              <Slot pool={displayPool} winners={roundWinners} spinning={spinning} />
            )}
            {mode === 'cards' && (
              <Cards pool={displayPool} winners={roundWinners} spinning={spinning} />
            )}
            {mode === 'lots' && <Lots winners={roundWinners} spinning={spinning} />}
          </div>
        </div>
      </div>

      <div className="stage-footer">
        {done && roundWinners.length > 0 ? (
          <div>
            <div className="muted">本轮中奖</div>
            <div className="display stage-winner-name">{roundWinners.join('、')}</div>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: '1.05rem' }}>
            池中可抽 <strong style={{ color: 'var(--ink)' }}>{available.length}</strong> 人
            {winners.length > 0 ? ` · 已累计中奖 ${winners.length} 人` : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function elResize(el: HTMLElement | null, cb: () => void): ResizeObserver | null {
  if (!el || typeof ResizeObserver === 'undefined') return null
  const ro = new ResizeObserver(() => cb())
  ro.observe(el)
  return ro
}
