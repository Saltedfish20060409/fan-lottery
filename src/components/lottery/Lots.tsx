import { useEffect, useState } from 'react'

export function Lots({
  winners,
  spinning,
}: {
  winners: string[]
  spinning: boolean
}) {
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    if (!spinning) {
      setDrawn(!!winners.length)
      return
    }
    setDrawn(false)
    const t = window.setTimeout(() => setDrawn(true), 1400)
    return () => window.clearTimeout(t)
  }, [spinning, winners.length])

  return (
    <div className="lottery-stage">
      <div className="stack" style={{ alignItems: 'center' }}>
        <div
          style={{
            width: 120,
            height: 150,
            borderRadius: '16px 16px 28px 28px',
            background: 'linear-gradient(180deg, #e76f51, #c45d43)',
            position: 'relative',
            boxShadow: '0 10px 24px rgba(231,111,81,0.35)',
            animation: spinning && !drawn ? 'lots-wiggle 0.25s infinite' : undefined,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                bottom: 20 + i * 8,
                left: 20 + (i % 3) * 18,
                width: 10,
                height: 56,
                borderRadius: 4,
                background: '#fff4eb',
                transform: `rotate(${-8 + i * 4}deg)`,
              }}
            />
          ))}
        </div>
        {drawn && winners[0] && (
          <div
            style={{
              marginTop: 8,
              padding: '14px 18px',
              borderRadius: 12,
              background: '#fff4eb',
              border: '2px dashed #e76f51',
              minWidth: 180,
              textAlign: 'center',
              animation: 'lots-pop 0.4s ease',
            }}
          >
            <div className="muted">抽中签文</div>
            <div className="display" style={{ fontSize: '1.5rem', color: '#e76f51' }}>
              {winners.join('、')}
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes lots-wiggle {
          0%,100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        @keyframes lots-pop {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
