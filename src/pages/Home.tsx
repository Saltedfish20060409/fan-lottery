import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="app-shell home-shell">
      <div className="home-hero card stack">
        <div className="hero-mark home-mark">抽</div>
        <p className="home-brand display">粉丝橱窗抽奖</p>
        <p className="home-lead">
          截图识别昵称，轮盘扭蛋公平开抽——给粉丝的福利，认真又好玩。
        </p>
        <Link className="btn btn-primary btn-block home-cta" to="/setup">
          开始抽奖
        </Link>
        <Link className="btn btn-soft btn-block" to="/background">
          背景设置
        </Link>
        <ol className="home-steps">
          <li>
            <span className="num">1</span>填自己的昵称，避免抽到本人
          </li>
          <li>
            <span className="num">2</span>上传评论截图或粘贴名单
          </li>
          <li>
            <span className="num">3</span>点选确认后，选个玩法开抽
          </li>
        </ol>
      </div>
      <p className="muted home-foot">可添加到主屏幕，下次开橱窗更方便</p>
    </div>
  )
}
