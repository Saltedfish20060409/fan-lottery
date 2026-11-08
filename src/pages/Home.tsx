import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="app-shell">
      <div className="card stack" style={{ marginTop: 24, textAlign: 'center', padding: 28 }}>
        <div className="hero-mark" style={{ margin: '0 auto 8px' }}>
          抽
        </div>
        <h1 style={{ fontSize: '2rem' }}>粉丝橱窗抽奖</h1>
        <p>
          把评论区截图传上来，自动识别昵称，再用轮盘、扭蛋等方式公平抽取福利名额。
        </p>
        <p className="muted" style={{ fontSize: '0.88rem' }}>
          截图只在你手机本地识别，不会上传到服务器。
        </p>
        <Link className="btn btn-primary btn-block" to="/setup" style={{ marginTop: 12 }}>
          开始抽奖
        </Link>
        <div className="stack" style={{ textAlign: 'left', marginTop: 8 }}>
          <div className="chip">① 填自己的昵称</div>
          <div className="chip">② 上传评论截图</div>
          <div className="chip">③ 在图上点出昵称再抽</div>
        </div>
      </div>
      <p className="muted" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
        建议用手机浏览器打开，可「添加到主屏幕」方便下次使用
      </p>
    </div>
  )
}
