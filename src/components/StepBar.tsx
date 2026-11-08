const STEPS = ['设置', '导入', '点选', '核对', '抽奖', '结果'] as const

export function StepBar({ current }: { current: number }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="step-bar" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
        {STEPS.map((_, i) => (
          <div
            key={STEPS[i]}
            className={`step-dot ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}
          />
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          步骤 {current + 1}/{STEPS.length} · {STEPS[current]}
        </span>
      </div>
    </div>
  )
}
