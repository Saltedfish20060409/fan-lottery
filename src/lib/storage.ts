import { DEFAULT_STATE, type AppState, type LotteryRecord } from '../types'

const KEY = 'fan-lottery-state-v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULT_STATE)
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      artistNames: {
        ...DEFAULT_STATE.artistNames,
        ...(parsed.artistNames ?? {}),
      },
      candidates: parsed.candidates ?? [],
      winners: parsed.winners ?? [],
      records: parsed.records ?? [],
    }
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // ignore quota errors on mobile
  }
}

export function appendRecord(
  records: LotteryRecord[],
  record: LotteryRecord,
): LotteryRecord[] {
  return [record, ...records].slice(0, 20)
}
