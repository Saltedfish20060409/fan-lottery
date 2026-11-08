import { useEffect, useMemo, useState } from 'react'

const SIZE = 260
const CX = SIZE / 2
const CY = SIZE / 2
const RADIUS = SIZE / 2 - 6

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + Math.cos(angleRad) * r,
    y: cy + Math.sin(angleRad) * r,
  }
}

function sectorPath(
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
): string {
  const s = polar(cx, cy, r, startRad)
  const e = polar(cx, cy, r, endRad)
  const large = endRad - startRad > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`
}

function fitLabel(name: string, maxChars: number): string {
  if (name.length <= maxChars) return name
  return `${name.slice(0, Math.max(1, maxChars - 1))}…`
}

export function Roulette({
  pool,
  winners,
  spinning,
}: {
  pool: string[]
  winners: string[]
  spinning: boolean
}) {
  const labels = useMemo(() => {
    const source = pool.length ? [...pool] : ['空']
    if (winners[0] && !source.includes(winners[0])) {
      source.unshift(winners[0])
    }
    let base = source.slice(0, 12)
    if (base.length < 8) {
      const out = [...base]
      while (out.length < 8) out.push(...base)
      base = out.slice(0, 8)
    }
    return base
  }, [pool, winners])

  const [rotation, setRotation] = useState(0)
  const n = labels.length
  const sliceDeg = 360 / n
  const maxChars = n >= 10 ? 4 : n >= 8 ? 5 : 6

  useEffect(() => {
    if (!spinning || !winners[0]) return
    const idx = labels.findIndex((name) => name === winners[0])
    const targetIndex = idx >= 0 ? idx : 0
    // Pointer at top; sector mid should land under pointer
    const extra = 360 * 5
    const target = extra + (360 - (targetIndex * sliceDeg + sliceDeg / 2))
    setRotation((r) => r + target)
  }, [spinning, winners, labels, sliceDeg])

  return (
    <div className="lottery-stage">
      <div
        style={{
          width: SIZE,
          height: SIZE,
          transition: spinning
            ? 'transform 4s cubic-bezier(0.12, 0.75, 0.12, 1)'
            : undefined,
          transform: `rotate(${rotation}deg)`,
          borderRadius: '50%',
          boxShadow: '0 0 0 6px #2a9d8f',
          background: '#fff',
          overflow: 'hidden',
        }}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {labels.map((name, i) => {
            // Start from top (-90deg)
            const startDeg = -90 + i * sliceDeg
            const endDeg = startDeg + sliceDeg
            const startRad = (startDeg * Math.PI) / 180
            const endRad = (endDeg * Math.PI) / 180
            const midRad = (startRad + endRad) / 2
            const midDeg = (startDeg + endDeg) / 2

            // Label sits inside the sector ring (not on the rim)
            const labelR = RADIUS * 0.62
            const { x, y } = polar(CX, CY, labelR, midRad)
            const fill = i % 2 === 0 ? '#ffe8e1' : '#e7f6f1'

            return (
              <g key={`${name}-${i}`}>
                <path
                  d={sectorPath(CX, CY, RADIUS, startRad, endRad)}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={2}
                />
                {/* Rotate so text runs along the sector midline, readable from center outward */}
                <text
                  x={x}
                  y={y}
                  fill="#1f2a2e"
                  fontSize={n > 10 ? 10 : 12}
                  fontFamily="var(--font-display), sans-serif"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${midDeg + 90} ${x} ${y})`}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {fitLabel(name, maxChars)}
                </text>
              </g>
            )
          })}
          <circle cx={CX} cy={CY} r={34} fill="#fff" stroke="#2a9d8f" strokeWidth={3} />
          <text
            x={CX}
            y={CY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#2a9d8f"
            fontSize={16}
            fontFamily="var(--font-display), sans-serif"
          >
            抽
          </text>
        </svg>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 10,
          width: 0,
          height: 0,
          borderLeft: '11px solid transparent',
          borderRight: '11px solid transparent',
          borderTop: '20px solid #e76f51',
          filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.15))',
          zIndex: 2,
        }}
      />
    </div>
  )
}
