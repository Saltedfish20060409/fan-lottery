import { Link } from 'react-router-dom'
import { StepBar } from './StepBar'

export function Layout({
  step,
  title,
  children,
  footer,
}: {
  step?: number
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="app-shell">
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="row" style={{ gap: 10 }}>
            <div className="hero-mark" style={{ width: 44, height: 44, fontSize: '1.2rem', borderRadius: 14 }}>
              抽
            </div>
            <div>
              <div className="display" style={{ fontSize: '1.1rem' }}>
                粉丝橱窗抽奖
              </div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                手机也能公平抽粉丝福利
              </div>
            </div>
          </div>
        </Link>
      </header>

      {typeof step === 'number' && <StepBar current={step} />}

      <main className="card stack">
        <h1 style={{ fontSize: '1.6rem' }}>{title}</h1>
        {children}
      </main>

      {footer && <div className="stack">{footer}</div>}
    </div>
  )
}
