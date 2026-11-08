import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Cards } from '../components/lottery/Cards'
import { Gacha } from '../components/lottery/Gacha'
import { Lots } from '../components/lottery/Lots'
import { Roulette } from '../components/lottery/Roulette'
import { Slot } from '../components/lottery/Slot'
import { useLottery } from '../store/LotteryContext'
import { MODE_LABELS, type LotteryMode } from '../types'

const MODES: LotteryMode[] = ['roulette', 'gacha', 'slot', 'cards', 'lots']

export function Draw() {
  const nav = useNavigate()
  const { mode, setMode, pool, drawCount, runDraw, winners } = useLottery()
  const [spinning, setSpinning] = useState(false)
  const [roundWinners, setRoundWinners] = useState<string[]>([])
  const [stagePool, setStagePool] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const spinTimer = useRef<number | null>(null)

  const available = pool.filter((n) => !winners.includes(n))
  const displayPool = stagePool.length ? stagePool : available.length ? available : pool
  const canDraw = available.length > 0 && !spinning

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
    <Layout
      step={4}
      title="选个好玩的抽法"
      footer={
        <>
          {!done ? (
            <button
              type="button"
              className="btn btn-coral btn-block"
              disabled={!canDraw}
              onClick={start}
            >
              {spinning ? '抽取中…' : `开抽（池中 ${available.length} 人）`}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => nav('/result')}
            >
              查看中奖结果
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-block" onClick={() => nav('/review')}>
            返回核对名单
          </button>
        </>
      }
    >
      <p>
        本次计划抽取 <strong>{drawCount}</strong> 人。底层都是公平随机，只是动画不同。
      </p>

      <div className="mode-grid">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            className={`mode-card ${mode === m ? 'active' : ''}`}
            disabled={spinning}
            onClick={() => setMode(m)}
          >
            <strong>{MODE_LABELS[m]}</strong>
            <span className="muted" style={{ fontSize: '0.82rem' }}>
              {m === 'roulette' && '指针转起来'}
              {m === 'gacha' && '摇一摇出球'}
              {m === 'slot' && '滚轮停格'}
              {m === 'cards' && '翻开幸运牌'}
              {m === 'lots' && '抽出一支签'}
            </span>
          </button>
        ))}
      </div>

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

      {done && roundWinners.length > 0 && (
        <div className="winner-banner card" style={{ boxShadow: 'none', background: '#fff4eb' }}>
          <div className="muted">本轮中奖</div>
          <div className="name">{roundWinners.join('、')}</div>
        </div>
      )}
    </Layout>
  )
}
