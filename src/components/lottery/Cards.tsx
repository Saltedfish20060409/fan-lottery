import { useEffect, useState } from 'react'
import { shuffle } from '../../lib/random'

export function Cards({
  pool,
  winners,
  spinning,
}: {
  pool: string[]
  winners: string[]
  spinning: boolean
}) {
  const [deck, setDeck] = useState<string[]>(() =>
    (pool.length ? pool : ['?']).slice(0, 9),
  )
  const [flipped, setFlipped] = useState<number[]>([])

  useEffect(() => {
    if (!spinning) return

    const rest = shuffle(pool.filter((n) => !winners.includes(n)))
    const size = Math.min(9, Math.max(winners.length || 6, Math.min(pool.length || 6, 9)))
    let cards = shuffle([...winners, ...rest]).slice(0, size)
    for (const w of winners) {
      if (!cards.includes(w)) {
        cards = [w, ...cards.slice(0, Math.max(0, size - 1))]
      }
    }
    cards = shuffle(cards)
    setDeck(cards)
    setFlipped([])

    const t = window.setTimeout(() => {
      setFlipped(
        winners.map((w) => cards.findIndex((n) => n === w)).filter((i) => i >= 0),
      )
    }, 1600)
    return () => window.clearTimeout(t)
    // winners identity: join for stable compare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, winners.join('|'), pool.join('|')])

  return (
    <div className="lottery-stage" style={{ padding: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          width: '100%',
        }}
      >
        {deck.map((name, i) => {
          const open = flipped.includes(i)
          return (
            <div key={`${name}-${i}`} style={{ height: 72, borderRadius: 12 }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  background: open ? '#ffe8e1' : '#2a9d8f',
                  color: open ? '#e76f51' : 'white',
                  fontFamily: 'var(--font-display)',
                  fontSize: open ? '0.95rem' : '1.2rem',
                  padding: 6,
                  textAlign: 'center',
                  wordBreak: 'break-all',
                  transition: 'background 0.35s ease, color 0.35s ease',
                }}
              >
                {open ? name : '?'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
