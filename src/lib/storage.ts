import {
  DEFAULT_STATE,
  type AppState,
  type Candidate,
  type LotteryRecord,
  type SourcePlatform,
} from '../types'

const KEY = 'fan-lottery-state-v1'

function normalizeCandidate(c: Partial<Candidate> & { name: string }): Candidate {
  const count = Math.max(1, c.count ?? 1)
  return {
    id: c.id ?? `legacy-${c.name}`,
    name: c.name,
    selected: c.selected ?? true,
    lowConfidence: c.lowConfidence ?? false,
    source: c.source ?? 'manual',
    count,
    weight: Math.max(1, c.weight ?? count),
    sourcePlatform: (c.sourcePlatform as SourcePlatform | undefined) ?? 'unknown',
    rawName: c.rawName,
    strippedSuffix: c.strippedSuffix,
  }
}

function normalizeRecord(r: Partial<LotteryRecord> & { winners: string[] }): LotteryRecord {
  return {
    id: r.id ?? `${Date.now()}`,
    drawId: r.drawId ?? `FL-LEGACY`,
    createdAt: r.createdAt ?? new Date().toISOString(),
    mode: r.mode ?? 'roulette',
    winners: r.winners,
    poolSize: r.poolSize ?? r.winners.length,
    drawCount: r.drawCount ?? r.winners.length,
  }
}

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
      candidates: (parsed.candidates ?? []).map((c) => normalizeCandidate(c)),
      winners: parsed.winners ?? [],
      records: (parsed.records ?? []).map((r) => normalizeRecord(r)),
      announceRules: parsed.announceRules ?? DEFAULT_STATE.announceRules,
      excludePastWinners: parsed.excludePastWinners ?? false,
      useWeighting: parsed.useWeighting ?? false,
      importPlatform: parsed.importPlatform ?? 'unknown',
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

export function pastWinnerSet(records: LotteryRecord[]): Set<string> {
  const set = new Set<string>()
  for (const r of records) {
    for (const w of r.winners) set.add(w.toLowerCase())
  }
  return set
}
