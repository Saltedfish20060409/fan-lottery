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
import { makeDrawId, pickWeightedWinners, pickWinners } from '../lib/random'
import {
  isArtistName,
  mergeCandidates,
  parsePastedNames,
  selectedEntries,
  selectedPool,
} from '../lib/nickname'
import { appendRecord, loadState, pastWinnerSet, saveState } from '../lib/storage'
import {
  type AppState,
  type ArtistNames,
  type Candidate,
  type LotteryMode,
  type LotteryRecord,
  type SourcePlatform,
} from '../types'

interface LotteryContextValue extends AppState {
  ocrPages: OcrPageResult[]
  setOcrPages: (pages: OcrPageResult[]) => void
  toggleOcrBox: (pageId: string, boxId: string) => void
  setArtistNames: (names: ArtistNames) => void
  setDrawCount: (n: number) => void
  setMode: (mode: LotteryMode) => void
  setAnnounceRules: (rules: string) => void
  setExcludePastWinners: (v: boolean) => void
  setUseWeighting: (v: boolean) => void
  setImportPlatform: (p: SourcePlatform) => void
  addFromOcr: (
    items: Array<{
      name: string
      selected: boolean
      lowConfidence: boolean
      source: 'ocr'
      sourcePlatform?: SourcePlatform
    }>,
  ) => void
  commitOcrSelection: (platform?: SourcePlatform) => number
  addFromPaste: (text: string, platform?: SourcePlatform) => void
  addManual: (name: string) => void
  updateCandidate: (id: string, patch: Partial<Candidate>) => void
  removeCandidate: (id: string) => void
  setAllSelected: (selected: boolean) => void
  setSelectedPlatform: (platform: SourcePlatform) => void
  clearCandidates: () => void
  refilterArtists: () => void
  runDraw: () => string[]
  undoLastDraw: () => boolean
  clearWinners: () => void
  clearHistory: () => void
  resetAll: () => void
  pool: string[]
  /** 当前可抽池（已应用排除往期等过滤） */
  drawPool: string[]
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

  const setAnnounceRules = useCallback((announceRules: string) => {
    setState((s) => ({ ...s, announceRules }))
  }, [])

  const setExcludePastWinners = useCallback((excludePastWinners: boolean) => {
    setState((s) => ({ ...s, excludePastWinners }))
  }, [])

  const setUseWeighting = useCallback((useWeighting: boolean) => {
    setState((s) => ({ ...s, useWeighting }))
  }, [])

  const setImportPlatform = useCallback((importPlatform: SourcePlatform) => {
    setState((s) => ({ ...s, importPlatform }))
  }, [])

  const addFromOcr = useCallback(
    (
      items: Array<{
        name: string
        selected: boolean
        lowConfidence: boolean
        source: 'ocr'
        sourcePlatform?: SourcePlatform
      }>,
    ) => {
      setState((s) => ({
        ...s,
        candidates: mergeCandidates(s.candidates, items, s.artistNames),
      }))
    },
    [],
  )

  const commitOcrSelection = useCallback(
    (platform?: SourcePlatform) => {
      let count = 0
      const plat = platform ?? stateRef.current.importPlatform
      setState((s) => {
        const items: Array<{
          name: string
          selected: boolean
          lowConfidence: boolean
          source: 'ocr'
          rawName?: string
          strippedSuffix?: string
          sourcePlatform: SourcePlatform
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
              sourcePlatform: plat,
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
    },
    [ocrPages],
  )

  const addFromPaste = useCallback((text: string, platform?: SourcePlatform) => {
    const names = parsePastedNames(text)
    setState((s) => {
      const plat = platform ?? s.importPlatform
      return {
        ...s,
        candidates: mergeCandidates(
          s.candidates,
          names.map((name) => ({
            name,
            selected: true,
            lowConfidence: false,
            source: 'paste' as const,
            sourcePlatform: plat,
          })),
          s.artistNames,
        ),
      }
    })
  }, [])

  const addManual = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      candidates: mergeCandidates(
        s.candidates,
        [
          {
            name,
            selected: true,
            lowConfidence: false,
            source: 'manual',
            sourcePlatform: s.importPlatform,
          },
        ],
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

  const setSelectedPlatform = useCallback((platform: SourcePlatform) => {
    setState((s) => ({
      ...s,
      candidates: s.candidates.map((c) =>
        c.selected ? { ...c, sourcePlatform: platform } : c,
      ),
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

  const buildDrawPool = useCallback((s: AppState): string[] => {
    let names = selectedPool(s.candidates).filter((n) => !s.winners.includes(n))
    if (s.excludePastWinners) {
      const past = pastWinnerSet(s.records)
      names = names.filter((n) => !past.has(n.toLowerCase()))
    }
    return names
  }, [])

  const runDraw = useCallback(() => {
    const s = stateRef.current
    const poolNames = buildDrawPool(s)
    if (!poolNames.length) return []

    let winners: string[]
    if (s.useWeighting) {
      const entries = selectedEntries(s.candidates).filter((e) =>
        poolNames.includes(e.name),
      )
      winners = pickWeightedWinners(entries, s.drawCount)
    } else {
      winners = pickWinners(poolNames, s.drawCount)
    }
    if (!winners.length) return []

    const record: LotteryRecord = {
      id: `${Date.now()}`,
      drawId: makeDrawId(),
      createdAt: new Date().toISOString(),
      mode: s.mode,
      winners,
      poolSize: poolNames.length,
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
  }, [buildDrawPool])

  const undoLastDraw = useCallback(() => {
    const s = stateRef.current
    const last = s.records[0]
    if (!last) return false
    const undone = new Set(last.winners)
    setState((prev) => ({
      ...prev,
      records: prev.records.slice(1),
      winners: prev.winners.filter((w) => !undone.has(w)),
      candidates: prev.candidates.map((c) =>
        undone.has(c.name) ? { ...c, selected: true } : c,
      ),
    }))
    return true
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
  const drawPool = useMemo(() => buildDrawPool(state), [state, buildDrawPool])

  const value = useMemo<LotteryContextValue>(
    () => ({
      ...state,
      ocrPages,
      setOcrPages,
      toggleOcrBox,
      setArtistNames,
      setDrawCount,
      setMode,
      setAnnounceRules,
      setExcludePastWinners,
      setUseWeighting,
      setImportPlatform,
      addFromOcr,
      commitOcrSelection,
      addFromPaste,
      addManual,
      updateCandidate,
      removeCandidate,
      setAllSelected,
      setSelectedPlatform,
      clearCandidates,
      refilterArtists,
      runDraw,
      undoLastDraw,
      clearWinners,
      clearHistory,
      resetAll,
      pool,
      drawPool,
    }),
    [
      state,
      ocrPages,
      setOcrPages,
      toggleOcrBox,
      setArtistNames,
      setDrawCount,
      setMode,
      setAnnounceRules,
      setExcludePastWinners,
      setUseWeighting,
      setImportPlatform,
      addFromOcr,
      commitOcrSelection,
      addFromPaste,
      addManual,
      updateCandidate,
      removeCandidate,
      setAllSelected,
      setSelectedPlatform,
      clearCandidates,
      refilterArtists,
      runDraw,
      undoLastDraw,
      clearWinners,
      clearHistory,
      resetAll,
      pool,
      drawPool,
    ],
  )

  return <LotteryContext.Provider value={value}>{children}</LotteryContext.Provider>
}

export function useLottery(): LotteryContextValue {
  const ctx = useContext(LotteryContext)
  if (!ctx) throw new Error('useLottery must be used within LotteryProvider')
  return ctx
}
