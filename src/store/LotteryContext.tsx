import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { OcrPageResult } from '../lib/ocr'
import { pickWinners } from '../lib/random'
import {
  isArtistName,
  mergeCandidates,
  parsePastedNames,
  selectedPool,
} from '../lib/nickname'
import { appendRecord, loadState, saveState } from '../lib/storage'
import {
  type AppState,
  type ArtistNames,
  type Candidate,
  type LotteryMode,
  type LotteryRecord,
} from '../types'

interface LotteryContextValue extends AppState {
  ocrPages: OcrPageResult[]
  setOcrPages: (pages: OcrPageResult[]) => void
  toggleOcrBox: (pageId: string, boxId: string) => void
  setArtistNames: (names: ArtistNames) => void
  setDrawCount: (n: number) => void
  setMode: (mode: LotteryMode) => void
  addFromOcr: (
    items: Array<{
      name: string
      selected: boolean
      lowConfidence: boolean
      source: 'ocr'
    }>,
  ) => void
  commitOcrSelection: () => number
  addFromPaste: (text: string) => void
  addManual: (name: string) => void
  updateCandidate: (id: string, patch: Partial<Candidate>) => void
  removeCandidate: (id: string) => void
  setAllSelected: (selected: boolean) => void
  clearCandidates: () => void
  refilterArtists: () => void
  runDraw: () => string[]
  clearWinners: () => void
  clearHistory: () => void
  resetAll: () => void
  pool: string[]
}

const LotteryContext = createContext<LotteryContextValue | null>(null)

export function LotteryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())
  const [ocrPages, setOcrPagesState] = useState<OcrPageResult[]>([])
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    saveState(state)
  }, [state])

  const setOcrPages = useCallback((pages: OcrPageResult[]) => {
    setOcrPagesState((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.imageUrl)
      return pages
    })
  }, [])

  const toggleOcrBox = useCallback((pageId: string, boxId: string) => {
    setOcrPagesState((pages) =>
      pages.map((page) => {
        if (page.id !== pageId) return page
        return {
          ...page,
          boxes: page.boxes.map((box) =>
            box.id === boxId ? { ...box, selected: !box.selected } : box,
          ),
        }
      }),
    )
  }, [])

  const setArtistNames = useCallback((artistNames: ArtistNames) => {
    setState((s) => ({ ...s, artistNames }))
  }, [])

  const setDrawCount = useCallback((drawCount: number) => {
    setState((s) => ({
      ...s,
      drawCount: Math.max(1, Math.min(50, Math.floor(drawCount) || 1)),
    }))
  }, [])

  const setMode = useCallback((mode: LotteryMode) => {
    setState((s) => ({ ...s, mode }))
  }, [])

  const addFromOcr = useCallback(
    (
      items: Array<{
        name: string
        selected: boolean
        lowConfidence: boolean
        source: 'ocr'
      }>,
    ) => {
      setState((s) => ({
        ...s,
        candidates: mergeCandidates(s.candidates, items, s.artistNames),
      }))
    },
    [],
  )

  const commitOcrSelection = useCallback(() => {
    let count = 0
    setState((s) => {
      const items: Array<{
        name: string
        selected: boolean
        lowConfidence: boolean
        source: 'ocr'
        rawName?: string
        strippedSuffix?: string
      }> = []
      for (const page of ocrPages) {
        for (const box of page.boxes) {
          if (!box.selected) continue
          items.push({
            name: box.text,
            selected: true,
            lowConfidence: !box.suggested || Boolean(box.strippedSuffix),
            source: 'ocr',
            rawName: box.rawText !== box.text ? box.rawText : undefined,
            strippedSuffix: box.strippedSuffix,
          })
        }
      }
      count = items.length
      return {
        ...s,
        candidates: mergeCandidates(s.candidates, items, s.artistNames),
      }
    })
    return count
  }, [ocrPages])

  const addFromPaste = useCallback((text: string) => {
    const names = parsePastedNames(text)
    setState((s) => ({
      ...s,
      candidates: mergeCandidates(
        s.candidates,
        names.map((name) => ({
          name,
          selected: true,
          lowConfidence: false,
          source: 'paste' as const,
        })),
        s.artistNames,
      ),
    }))
  }, [])

  const addManual = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      candidates: mergeCandidates(
        s.candidates,
        [{ name, selected: true, lowConfidence: false, source: 'manual' }],
        s.artistNames,
      ),
    }))
  }, [])

  const updateCandidate = useCallback((id: string, patch: Partial<Candidate>) => {
    setState((s) => ({
      ...s,
      candidates: s.candidates.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }, [])

  const removeCandidate = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      candidates: s.candidates.filter((c) => c.id !== id),
    }))
  }, [])

  const setAllSelected = useCallback((selected: boolean) => {
    setState((s) => ({
      ...s,
      candidates: s.candidates.map((c) => ({ ...c, selected })),
    }))
  }, [])

  const clearCandidates = useCallback(() => {
    setState((s) => ({ ...s, candidates: [], winners: [] }))
  }, [])

  const refilterArtists = useCallback(() => {
    setState((s) => ({
      ...s,
      candidates: s.candidates.filter((c) => !isArtistName(c.name, s.artistNames)),
    }))
  }, [])

  const runDraw = useCallback(() => {
    // 必须在 setState 外抽签：React 19 下 updater 不一定同步执行，
    // 以前在回调里赋值再 return，经常拿到 []，导致首点无动画、二点又抽一次。
    const s = stateRef.current
    const pool = selectedPool(s.candidates).filter((n) => !s.winners.includes(n))
    const winners = pickWinners(pool, s.drawCount)
    if (!winners.length) return []

    const record: LotteryRecord = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      mode: s.mode,
      winners,
      poolSize: pool.length,
      drawCount: s.drawCount,
    }
    setState((prev) => ({
      ...prev,
      winners: [...prev.winners, ...winners],
      records: appendRecord(prev.records, record),
      candidates: prev.candidates.map((c) =>
        winners.includes(c.name) ? { ...c, selected: false } : c,
      ),
    }))
    return winners
  }, [])

  const clearWinners = useCallback(() => {
    setState((s) => ({ ...s, winners: [] }))
  }, [])

  const clearHistory = useCallback(() => {
    setState((s) => ({ ...s, winners: [], records: [] }))
  }, [])

  const resetAll = useCallback(() => {
    setOcrPages([])
    setState((s) => ({
      ...s,
      candidates: [],
      winners: [],
      drawCount: 1,
      mode: 'roulette',
    }))
  }, [setOcrPages])

  const pool = useMemo(() => selectedPool(state.candidates), [state.candidates])

  const value = useMemo<LotteryContextValue>(
    () => ({
      ...state,
      ocrPages,
      setOcrPages,
      toggleOcrBox,
      setArtistNames,
      setDrawCount,
      setMode,
      addFromOcr,
      commitOcrSelection,
      addFromPaste,
      addManual,
      updateCandidate,
      removeCandidate,
      setAllSelected,
      clearCandidates,
      refilterArtists,
      runDraw,
      clearWinners,
      clearHistory,
      resetAll,
      pool,
    }),
    [
      state,
      ocrPages,
      setOcrPages,
      toggleOcrBox,
      setArtistNames,
      setDrawCount,
      setMode,
      addFromOcr,
      commitOcrSelection,
      addFromPaste,
      addManual,
      updateCandidate,
      removeCandidate,
      setAllSelected,
      clearCandidates,
      refilterArtists,
      runDraw,
      clearWinners,
      clearHistory,
      resetAll,
      pool,
    ],
  )

  return <LotteryContext.Provider value={value}>{children}</LotteryContext.Provider>
}

export function useLottery(): LotteryContextValue {
  const ctx = useContext(LotteryContext)
  if (!ctx) throw new Error('useLottery must be used within LotteryProvider')
  return ctx
}
