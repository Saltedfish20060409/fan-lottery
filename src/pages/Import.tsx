import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { preloadOcr, recognizePagesFromFiles } from '../lib/ocr'
import {
  isStaleChunkError,
  recoverFromStaleAssets,
} from '../lib/staleCache'
import { useLottery } from '../store/LotteryContext'

export function Import() {
  const nav = useNavigate()
  const { setOcrPages, addFromPaste, candidates, ocrPages } = useLottery()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [paste, setPaste] = useState('')

  useEffect(() => {
    let cancelled = false
    setProgress('正在预加载识别引擎（首次约 1～3 分钟，可先截好图）…')
    void preloadOcr((msg) => {
      if (!cancelled) setProgress(msg)
    })
      .then(() => {
        if (cancelled) return
        setEngineReady(true)
        setProgress('引擎已就绪，可以上传截图了')
      })
      .catch((e) => {
        if (cancelled) return
        if (isStaleChunkError(e)) {
          setProgress('检测到旧版本缓存，正在清理并刷新…')
          void recoverFromStaleAssets().then((didReload) => {
            if (cancelled || didReload) return
            setError(
              '引擎文件已更新，但本机还留着旧缓存。请到浏览器「网站设置」里清除本站数据后重开，或用无痕窗口打开。',
            )
            setProgress('')
          })
          return
        }
        const msg = e instanceof Error ? e.message : String(e)
        setError(
          /timed out/i.test(msg)
            ? '识别引擎初始化超时：手机性能不足或网络较慢。请换电脑/平板 Chrome 再试，或改用下方粘贴昵称。'
            : `引擎预加载失败：${msg}`,
        )
        setProgress('')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files].filter((f) => f.type.startsWith('image/'))
    if (!list.length) {
      setError('请选择图片截图')
      return
    }
    setError('')
    setBusy(true)
    try {
      const pages = await recognizePagesFromFiles(list, setProgress)
      if (!pages.length) {
        setError('没有识别到文字，请换更清晰的评论区截图')
        return
      }
      const suggested = pages.reduce(
        (n, p) => n + p.boxes.filter((b) => b.suggested).length,
        0,
      )
      setOcrPages(pages)
      setProgress(`识别完成：自动标出约 ${suggested} 个昵称，请点选确认`)
      nav('/pick')
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : String(e)
      if (/timed out/i.test(msg)) {
        setError(
          '识别引擎初始化超时（手机跑 WASM 较慢）。请保持页面打开多等一会再试，或改用电脑/平板 Chrome；也可直接粘贴昵称。',
        )
      } else if (/wasm|backend|initWasm/i.test(msg)) {
        setError(`识别失败：${msg}（请硬刷新后再试；仍不行可用下方粘贴昵称）`)
      } else {
        setError(`识别失败：${msg}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const onPasteAdd = () => {
    if (!paste.trim()) return
    addFromPaste(paste)
    setPaste('')
    nav('/review')
  }

  return (
    <Layout
      step={1}
      title="导入评论截图"
      footer={
        <>
          {ocrPages.length > 0 && (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => nav('/pick')}
            >
              继续点选昵称（{ocrPages.length} 张）
            </button>
          )}
          {candidates.length > 0 && (
            <button
              type="button"
              className="btn btn-soft btn-block"
              onClick={() => nav('/review')}
            >
              跳过点选，直接看名单（{candidates.length} 人）
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-block" onClick={() => nav('/setup')}>
            返回上一步
          </button>
        </>
      }
    >
      <div
        className="upload-zone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && engineReady && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && engineReady && !busy) {
            inputRef.current?.click()
          }
        }}
        style={{ opacity: engineReady ? 1 : 0.65 }}
      >
        <strong>
          {busy ? '识别中…' : engineReady ? '点这里选截图' : '引擎加载中，请稍候…'}
        </strong>
        <span className="muted">识别后会让你在图上点出昵称；手机首次加载会较慢</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={!engineReady || busy}
          onChange={(e) => void onFiles(e.target.files)}
        />
      </div>

      {progress && <div className="progress">{progress}</div>}
      {error && (
        <div className="progress" style={{ background: '#ffe8e1', color: '#c45d43' }}>
          {error}
        </div>
      )}

      <div className="guide stack">
        <details open>
          <summary>怎么截评论区？</summary>
          <ol>
            <li>打开动态/视频评论，尽量选「最新」排序</li>
            <li>从上往下边滑边截图，保证头像旁昵称清楚</li>
            <li>上传后：绿色框是猜的昵称，点一下就能改</li>
          </ol>
        </details>
      </div>

      <div className="field">
        <label htmlFor="paste">备选：粘贴昵称（一行一个）</label>
        <textarea
          id="paste"
          rows={4}
          placeholder={'小明\n阿花粉丝001\n...'}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
      </div>
      <button type="button" className="btn btn-soft btn-block" onClick={onPasteAdd}>
        粘贴后直接进入名单
      </button>
    </Layout>
  )
}
