import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AnnounceStickerEditor } from '../components/AnnounceStickerEditor'
import { Layout } from '../components/Layout'
import { buildAnnounceText, downloadAnnouncePng, type PosterSticker } from '../lib/announce'
import { useLottery } from '../store/LotteryContext'

export function Announce() {
  const {
    winners,
    records,
    mode,
    artistNames,
    announceRules,
    setAnnounceRules,
  } = useLottery()
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stickers, setStickers] = useState<PosterSticker[]>([])
  const stickersRef = useRef(stickers)
  stickersRef.current = stickers

  const latest = records[0]
  const payload = useMemo(
    () => ({
      artistNames,
      winners,
      rules: announceRules,
      mode,
      latest,
      stickers,
    }),
    [artistNames, winners, announceRules, mode, latest, stickers],
  )

  const text = useMemo(() => buildAnnounceText(payload), [payload])

  useEffect(() => {
    return () => {
      for (const s of stickersRef.current) URL.revokeObjectURL(s.src)
    }
  }, [])

  if (!winners.length) {
    return <Navigate to="/result" replace />
  }

  const handleStickersChange = (next: PosterSticker[]) => {
    const nextIds = new Set(next.map((s) => s.id))
    for (const s of stickers) {
      if (!nextIds.has(s.id)) URL.revokeObjectURL(s.src)
    }
    setStickers(next)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('请手动复制：', text)
    }
  }

  const savePoster = async () => {
    setSaving(true)
    try {
      await downloadAnnouncePng(payload)
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout
      title="制作公示图"
      footer={
        <>
          <button
            type="button"
            className="btn btn-coral btn-block"
            disabled={saving}
            onClick={() => void savePoster()}
          >
            {saving ? '生成中…' : '保存公示图'}
          </button>
          <button type="button" className="btn btn-primary btn-block" onClick={() => void copy()}>
            {copied ? '已复制' : '复制公示文案'}
          </button>
          <Link className="btn btn-ghost btn-block" to="/result">
            返回结果页
          </Link>
        </>
      }
    >
      <div className="stack">
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          可改兑奖说明、加表情包或自拍，调好位置后再保存。文案与图片都会按当前预览生成。
        </p>

        <div className="field">
          <label htmlFor="announce-rules">兑奖 / 活动说明（写入文案和图片）</label>
          <textarea
            id="announce-rules"
            rows={4}
            value={announceRules}
            onChange={(e) => setAnnounceRules(e.target.value)}
            placeholder="例如：兑奖请私信，并提供已关注截图…"
          />
        </div>

        <div className="field">
          <label>文案预览</label>
          <pre className="announce-text-preview">{text}</pre>
        </div>

        <AnnounceStickerEditor
          payload={payload}
          stickers={stickers}
          onChange={handleStickersChange}
        />
      </div>
    </Layout>
  )
}
