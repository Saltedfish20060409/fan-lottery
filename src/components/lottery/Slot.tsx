import { useEffect, useState } from 'react'

export function Slot({
  pool,
  winners,
  spinning,
}: {
  pool: string[]
  winners: string[]
  spinning: boolean
}) {
  const reel = pool.length ? pool : ['—']
  const [offset, setOffset] = useState(0)
  const [stopped, setStopped] = useState(false)

  useEffect(() => {
    if (!spinning) {
      setStopped(!!winners.length)
      return
    }
    setStopped(false)
    let frame = 0
    const id = window.setInterval(() => {
      frame += 1
      setOffset((o) => (o + 1) % reel.length)
      if (frame > 28) {
        window.clearInterval(id)
        const idx = Math.max(0, reel.indexOf(winners[0] ?? reel[0]!))
        setOffset(idx)
        setStopped(true)
      }
    }, 70)
    return () => window.clearInterval(id)
  }, [spinning, winners, reel])

  const shown = [
    reel[(offset - 1 + reel.length) % reel.length]!,
    reel[offset % reel.length]!,
    reel[(offset + 1) % reel.length]!,
  ]

  return (
    <div className="lottery-stage">
      <div
        style={{
          width: 240,
          borderRadius: 16,
          background: '#1f2a2e',
          padding: 12,
          color: 'white',
        }}
      >
        {shown.map((name, i) => (
          <div
            key={`${name}-${i}`}
            style={{
              padding: '12px 10px',
              margin: '6px 0',
              borderRadius: 10,
              textAlign: 'center',
              background: i === 1 ? '#2a9d8f' : 'rgba(255,255,255,0.08)',
              fontFamily: i === 1 ? 'var(--font-display)' : undefined,
              fontSize: i === 1 ? '1.25rem' : '0.95rem',
              opacity: i === 1 ? 1 : 0.55,
              transform: i === 1 && stopped ? 'scale(1.04)' : undefined,
              transition: 'transform 0.2s ease',
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  )
}
