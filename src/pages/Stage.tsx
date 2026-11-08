import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cards } from '../components/lottery/Cards'
import { Gacha } from '../components/lottery/Gacha'
import { Lots } from '../components/lottery/Lots'
import { Roulette } from '../components/lottery/Roulette'
import { Slot } from '../components/lottery/Slot'
import { useLottery } from '../store/LotteryContext'
import { MODE_LABELS } from '../types'

export function Stage() {
  const { mode, drawPool, pool, drawCount, runDraw, winners, records } = useLottery()
  const [spinning, setSpinning] = useState(false)
  const [roundWinners, setRoundWinners] = useState<string[]>([])
  const [stagePool, setStagePool] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const spinTimer = useRef<number | null>(null)

  const available = drawPool
  const displayPool = stagePool.length ? stagePool : available.length ? available : pool
  const canDraw = available.length > 0 && !spinning
  const latest = records[0]

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
          <div className="muted">投屏模式 · {MODE_LABELS[mode]}</div>
          <h1 className="display" style={{ margin: '4px 0 0', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>
            粉丝橱窗抽奖
          </h1>
        </div>
        <div className="row">
          <Link className="btn btn-ghost" to="/draw">
            返回抽奖页
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
            style={{ minWidth: 140 }}
          >
            {spinning ? '抽取中…' : `开抽 ${drawCount} 人`}
          </button>
        </div>
      </div>

      <div className="stage-main">
        {mode === 'roulette' && (
          <Roulette pool={displayPool} winners={roundWinners} spinning={spinning} />
        )}
        {mode === 'gacha' && <Gacha winners={roundWinners} spinning={spinning} />}
        {mode === 'slot' && <Slot pool={displayPool} winners={roundWinners} spinning={spinning} />}
        {mode === 'cards' && <Cards pool={displayPool} winners={roundWinners} spinning={spinning} />}
        {mode === 'lots' && <Lots winners={roundWinners} spinning={spinning} />}
      </div>

      <div className="stage-footer">
        {done && roundWinners.length > 0 ? (
          <div>
            <div className="muted">本轮中奖</div>
            <div className="display" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', color: '#e76f51' }}>
              {roundWinners.join('、')}
            </div>
            {latest?.drawId && (
              <div className="muted" style={{ marginTop: 8 }}>
                开奖编号 {latest.drawId}
              </div>
            )}
          </div>
        ) : (
          <div className="muted">
            池中可抽 {available.length} 人
            {winners.length > 0 ? ` · 已累计中奖 ${winners.length} 人` : ''}
          </div>
        )}
      </div>
    </div>
  )
}
