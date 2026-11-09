import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import defaultArt from '../assets/bg-couple.jpg'
import {
  loadBgSettings,
  resolveBgView,
  saveBgSettings,
  type BgSettings,
} from '../lib/background'

interface BgContextValue {
  settings: BgSettings
  view: BgSettings
  setSettings: (next: BgSettings) => void
  updateSettings: (patch: Partial<BgSettings>) => void
  resetDefaults: () => void
}

const BgContext = createContext<BgContextValue | null>(null)

export function useBackground() {
  const ctx = useContext(BgContext)
  if (!ctx) throw new Error('useBackground must be used within AppBackground')
  return ctx
}

export function AppBackground({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<BgSettings>(() => loadBgSettings())
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const view = useMemo(() => resolveBgView(settings, width), [settings, width])

  const setSettings = useCallback((next: BgSettings) => {
    setSettingsState(next)
    saveBgSettings(next)
  }, [])

  const updateSettings = useCallback((patch: Partial<BgSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch, customized: true }
      saveBgSettings(next)
      return next
    })
  }, [])

  const resetDefaults = useCallback(() => {
    const next: BgSettings = {
      customized: false,
      imageDataUrl: null,
      zoom: 150,
      posX: 50,
      posY: 58,
    }
    setSettingsState(next)
    saveBgSettings(next)
  }, [])

  const image = view.imageDataUrl || defaultArt

  const value = useMemo(
    () => ({ settings, view, setSettings, updateSettings, resetDefaults }),
    [settings, view, setSettings, updateSettings, resetDefaults],
  )

  return (
    <BgContext.Provider value={value}>
      <div
        className="app-bg"
        aria-hidden
        style={{
          backgroundImage: `url(${image})`,
          backgroundSize: `auto ${view.zoom}%`,
          backgroundPosition: `${view.posX}% ${view.posY}%`,
        }}
      />
      {children}
    </BgContext.Provider>
  )
}
