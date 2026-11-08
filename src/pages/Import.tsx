import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { recognizePagesFromFiles } from '../lib/ocr'
import { useLottery } from '../store/LotteryContext'

export function Import() {
  const nav = useNavigate()
  const { setOcrPages, addFromPaste, candidates, ocrPages } = useLottery()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [paste, setPaste] = useState('')

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
      const wasmHint =
        /wasm|backend|initWasm/i.test(msg)
          ? '（识别引擎加载失败：请硬刷新页面后再试；仍不行可用下方粘贴昵称）'
          : ''
      setError(`识别失败：${msg}${wasmHint}`)
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
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
      >
        <strong>{busy ? '识别中…' : '点这里选截图'}</strong>
        <span className="muted">识别后会让你在图上点出昵称，不用自己从正文里挑</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
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
