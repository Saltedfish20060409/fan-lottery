import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useLottery } from '../store/LotteryContext'

export function Setup() {
  const nav = useNavigate()
  const { artistNames, setArtistNames, drawCount, setDrawCount, refilterArtists } =
    useLottery()
  const [local, setLocal] = useState(artistNames)
  const [count, setCount] = useState(String(drawCount))

  const onNext = () => {
    setArtistNames(local)
    setDrawCount(Number(count) || 1)
    refilterArtists()
    nav('/import')
  }

  return (
    <Layout
      step={0}
      title="先填你的昵称"
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={onNext}>
          下一步：导入评论
        </button>
      }
    >
      <p>用来排除画师本人，避免抽到自己。三个平台可只填会用到的。</p>

      <div className="field">
        <label htmlFor="bili">B站昵称</label>
        <input
          id="bili"
          placeholder="例如：小画师阿花"
          value={local.bilibili}
          onChange={(e) => setLocal({ ...local, bilibili: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="xhs">小红书昵称</label>
        <input
          id="xhs"
          placeholder="可留空"
          value={local.xiaohongshu}
          onChange={(e) => setLocal({ ...local, xiaohongshu: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="dy">抖音昵称</label>
        <input
          id="dy"
          placeholder="可留空"
          value={local.douyin}
          onChange={(e) => setLocal({ ...local, douyin: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="n">这次要抽几个人？</label>
        <input
          id="n"
          type="number"
          min={1}
          max={50}
          inputMode="numeric"
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
      </div>
    </Layout>
  )
}
