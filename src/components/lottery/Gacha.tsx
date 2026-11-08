import { useEffect, useState } from 'react'

export function Gacha({
  winners,
  spinning,
}: {
  winners: string[]
  spinning: boolean
}) {
  const [phase, setPhase] = useState<'idle' | 'shake' | 'reveal'>('idle')

  useEffect(() => {
    if (!spinning) {
      setPhase(winners.length ? 'reveal' : 'idle')
      return
    }
    setPhase('shake')
    const t = window.setTimeout(() => setPhase('reveal'), 1800)
    return () => window.clearTimeout(t)
  }, [spinning, winners.length])

  return (
    <div className="lottery-stage">
      <div
        className="stack"
        style={{
          alignItems: 'center',
          animation: phase === 'shake' ? 'gacha-shake 0.35s ease-in-out infinite' : undefined,
        }}
      >
        <div
          style={{
            width: 140,
            height: 170,
            borderRadius: '70px 70px 24px 24px',
            background: 'linear-gradient(180deg, #2a9d8f, #1f7a6f)',
            position: 'relative',
            boxShadow: '0 12px 24px rgba(31,122,111,0.35)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 28,
              left: 22,
              right: 22,
              height: 70,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.35)',
              overflow: 'hidden',
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: ['#e76f51', '#e9c46a', '#fff', '#ffb4a2', '#7bc6bb'][i],
                  left: 10 + i * 16,
                  top: 18 + (i % 2) * 12,
                }}
              />
            ))}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 18,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 48,
              height: 14,
              borderRadius: 8,
              background: '#123',
            }}
          />
        </div>

        {phase === 'reveal' && winners[0] && (
          <div className="winner-banner" style={{ marginTop: 8 }}>
            <div className="muted">扭出了</div>
            <div className="name">{winners.join('、')}</div>
          </div>
        )}
        {phase === 'shake' && <div className="muted">咔咔咔…</div>}
      </div>
      <style>{`
        @keyframes gacha-shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg); }
          75% { transform: rotate(6deg); }
        }
      `}</style>
    </div>
  )
}
