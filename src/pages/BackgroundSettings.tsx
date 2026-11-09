import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBackground } from '../components/AppBackground'
import { Layout } from '../components/Layout'
import { fileToBgDataUrl } from '../lib/background'

export function BackgroundSettings() {
  const { view, settings, updateSettings, resetDefaults } = useBackground()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onPick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const dataUrl = await fileToBgDataUrl(file)
      updateSettings({ imageDataUrl: dataUrl, customized: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Layout
      title="背景设置"
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => {
              if (confirm('恢复默认插画，并按手机/平板/电脑自动居中？')) {
                resetDefaults()
              }
            }}
          >
            恢复默认
          </button>
          <Link className="btn btn-primary btn-block" to="/">
            完成
          </Link>
        </>
      }
    >
      <div className="stack">
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          拖动滑条实时看背后的人物位置。也可换成自己的图。设置保存在本机。
        </p>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-soft"
            style={{ minHeight: 40 }}
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? '处理中…' : '导入自己的图'}
          </button>
          {settings.imageDataUrl && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ minHeight: 40 }}
              onClick={() => updateSettings({ imageDataUrl: null })}
            >
              用回默认插画
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void onPick(e.target.files)}
          />
        </div>

        {error && (
          <div className="progress" style={{ background: '#ffe8e1', color: '#c45d43' }}>
            {error}
          </div>
        )}

        <label className="stack" style={{ gap: 6 }}>
          <span className="row" style={{ justifyContent: 'space-between' }}>
            <span>缩放</span>
            <span className="muted">{view.zoom}%</span>
          </span>
          <input
            type="range"
            min={100}
            max={260}
            value={view.zoom}
            onChange={(e) => updateSettings({ zoom: Number(e.target.value) })}
          />
        </label>

        <label className="stack" style={{ gap: 6 }}>
          <span className="row" style={{ justifyContent: 'space-between' }}>
            <span>左右</span>
            <span className="muted">{view.posX}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={view.posX}
            onChange={(e) => updateSettings({ posX: Number(e.target.value) })}
          />
        </label>

        <label className="stack" style={{ gap: 6 }}>
          <span className="row" style={{ justifyContent: 'space-between' }}>
            <span>上下</span>
            <span className="muted">{view.posY}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={view.posY}
            onChange={(e) => updateSettings({ posY: Number(e.target.value) })}
          />
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            人物偏上就往下调「上下」；偏下就往上调。数值约 55～60 通常接近居中。
          </span>
        </label>

        <div className="bg-hint card" style={{ padding: 14 }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            当前：{settings.imageDataUrl ? '自定义图' : '默认插画'}
            {settings.customized ? ' · 已手动调整' : ' · 跟设备自动居中'}
          </div>
        </div>
      </div>
    </Layout>
  )
}
