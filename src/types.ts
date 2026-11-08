export type LotteryMode = 'roulette' | 'gacha' | 'slot' | 'cards' | 'lots'

export interface ArtistNames {
  bilibili: string
  xiaohongshu: string
  douyin: string
}

export interface Candidate {
  id: string
  name: string
  selected: boolean
  lowConfidence: boolean
  source: 'ocr' | 'paste' | 'manual'
  count: number
}

export interface LotteryRecord {
  id: string
  createdAt: string
  mode: LotteryMode
  winners: string[]
  poolSize: number
  drawCount: number
}

export interface AppState {
  artistNames: ArtistNames
  drawCount: number
  candidates: Candidate[]
  winners: string[]
  mode: LotteryMode
  records: LotteryRecord[]
}

export const MODE_LABELS: Record<LotteryMode, string> = {
  roulette: '轮盘',
  gacha: '扭蛋机',
  slot: '老虎机',
  cards: '翻牌',
  lots: '签筒',
}

export const DEFAULT_STATE: AppState = {
  artistNames: {
    bilibili: '',
    xiaohongshu: '',
    douyin: '',
  },
  drawCount: 1,
  candidates: [],
  winners: [],
  mode: 'roulette',
  records: [],
}
