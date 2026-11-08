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
      <header className="app-header">
        <Link to="/" className="brand-link">
          <div className="hero-mark brand-mark">抽</div>
          <div>
            <div className="display brand-title">粉丝橱窗抽奖</div>
            <div className="muted brand-sub">公平 · 好玩 · 本机保存</div>
          </div>
        </Link>
      </header>

      {typeof step === 'number' && <StepBar current={step} />}

      <main className="card stack main-card">
        <h1 className="page-title">{title}</h1>
        {children}
      </main>

      {footer && <div className="stack footer-actions">{footer}</div>}
    </div>
  )
}
