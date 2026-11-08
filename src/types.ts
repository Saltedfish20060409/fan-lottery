export type LotteryMode = 'roulette' | 'gacha' | 'slot' | 'cards' | 'lots'

export type SourcePlatform = 'bilibili' | 'xiaohongshu' | 'douyin' | 'unknown'

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
  /** 抽奖权重；默认跟出现次数走，可手动改 */
  weight: number
  sourcePlatform: SourcePlatform
  /** OCR 清洗前原文；用于误剥后缀时一键恢复 */
  rawName?: string
  /** 自动去掉的疑似等级碎片（如 G / 9） */
  strippedSuffix?: string
}

export interface LotteryRecord {
  id: string
  /** 对外公示用的开奖编号 */
  drawId: string
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
  /** 活动规则，写入公示文案/图片 */
  announceRules: string
  /** 抽奖前：不抽本机历史已中过的人 */
  excludePastWinners: boolean
  /** 抽奖前：按权重抽取 */
  useWeighting: boolean
  /** 导入批次默认平台 */
  importPlatform: SourcePlatform
}

export const MODE_LABELS: Record<LotteryMode, string> = {
  roulette: '轮盘',
  gacha: '扭蛋机',
  slot: '老虎机',
  cards: '翻牌',
  lots: '签筒',
}

export const PLATFORM_LABELS: Record<SourcePlatform, string> = {
  bilibili: 'B站',
  xiaohongshu: '小红书',
  douyin: '抖音',
  unknown: '未指定',
}

export const DEFAULT_ANNOUNCE_RULES =
  '中奖请私信联系，并提供至少一个平台「已关注」截图；核对通过后开橱窗。一人一票，本机加密随机抽取。'

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
  announceRules: DEFAULT_ANNOUNCE_RULES,
  excludePastWinners: false,
  useWeighting: false,
  importPlatform: 'unknown',
}
