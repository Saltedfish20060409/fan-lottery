import type { ArtistNames, Candidate } from '../types'

const UI_PATTERNS: RegExp[] = [
  /^回复/,
  /^点赞$/,
  /^展开/,
  /^收起/,
  /^作者$/,
  /^置顶$/,
  /^刚刚$/,
  /^\d+\s*[分秒时天]钟?前/,
  /^\d+\s*小时前/,
  /^\d+\s*天前/,
  /^\d+\s*秒前/,
  /^\d{1,2}:\d{2}$/,
  /^\d{1,2}月\d{1,2}日/,
  /IP\s*属地/,
  /^属地/,
  /^赞$/,
  /^说点什么/,
  /^热门$/,
  /^最新$/,
  /^评论\s*\d*$/,
  /^分享$/,
  /^收藏$/,
  /^关注$/,
  /^已关注$/,
  /^粉丝$/,
  /^发送$/,
  /^取消$/,
  /^确定$/,
  /^全部$/,
  /^查看/,
  /^共\d+/,
  /^条回复/,
  /^\d+\s*条回复/,
  /^我也发/,
  /^友善评论/,
  /^按热度/,
  /^按时间/,
  /^\d+$/,
  /^·$/,
  /^…$/,
  /^\.{2,}$/,
  /^#$/,
  /^http/i,
  /^www\./i,
  /^bilibili$/i,
  /^小红书$/,
  /^抖音$/,
  /^米画师$/,
  /^APP$/,
  /^网页$/,
  // 等级 / 会员 / 粉丝团徽章（单独成框时）
  /^Lv\.?\s*[0-6]$/i,
  /^LV\.?\s*[0-6]$/i,
  /^[lI|][vV]\.?\s*[0-6]$/,
  /^等级[0-6]$/,
  /^UL\.?\s*\d{1,2}$/i,
  /^UP\.?\s*\d{1,2}$/i,
  /^VIP\d*$/i,
  /^大会员$/,
  /^年费大会员$/,
  /^硬核会员$/,
  /^粉丝团$/,
  /^灯牌$/,
  /^博主$/,
  /^笔记作者$/,
  // 等级图标被 OCR 拆成单独的怪字符（G/E/9/l6 等）
  /^[A-Za-z]$/,
  /^[A-Za-z][0-9]$/,
  /^[0-9][A-Za-z]$/,
  /^[lI1][vV]?[0-6]?$/i,
]

const MAX_NICK_LEN = 18
const MIN_NICK_LEN = 2

export interface OcrLine {
  text: string
  score: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface OcrBox extends OcrLine {
  id: string
  suggested: boolean
  selected: boolean
}

/** Lv 图标常被 OCR 认成这些短后缀（9/G/E/l6 等） */
function isBadgeOcrJunk(suffix: string): boolean {
  return /^(?:[A-Za-z]|[0-9]|[A-Za-z][0-9]|[0-9][A-Za-z]|[lI1][vV]|[lI|][vV]?[0-6]?|Lv\.?[0-6]?|LV\.?[0-6]?|等级[0-6]?)$/i.test(
    suffix,
  )
}

/** Strip platform badges OCR often glues onto nicknames */
function stripPlatformBadges(raw: string): string {
  let s = raw
  const suffixPatterns: RegExp[] = [
    // B站账号等级
    /Lv\.?\s*[0-6]$/i,
    /LV\.?\s*[0-6]$/i,
    /[lI|][vV]\.?\s*[0-6]$/,
    /等级[0-6]$/,
    // B站直播等级
    /UL\.?\s*\d{1,2}$/i,
    /UP\.?\s*\d{1,2}$/i,
    // 会员 / 认证类
    /年费大会员$/,
    /大会员$/,
    /硬核会员$/,
    /VIP\d*$/i,
    /会员$/,
    // 小红书
    /作者$/,
    /博主$/,
    // 抖音直播粉丝团等
    /粉丝团\d*$/,
    /灯牌$/,
    /来了$/,
  ]

  let changed = true
  while (changed) {
    changed = false
    for (const re of suffixPatterns) {
      const next = s.replace(re, '')
      if (next !== s && next.length >= MIN_NICK_LEN) {
        s = next
        changed = true
      }
    }
  }

  // 含中文昵称时：剥掉末尾 1～2 位被误读的等级碎片（9 / G / E / l6 …）
  // 只剥「徽章像」的短后缀，保留「粉丝88」「小明2024」这类更长数字尾巴
  if (/[\u4e00-\u9fff]/.test(s)) {
    for (let i = 0; i < 3; i++) {
      const m = s.match(/^(.+[\u4e00-\u9fff])([A-Za-z0-9]{1,2})$/)
      if (!m || m[1]!.length < MIN_NICK_LEN) break
      if (!isBadgeOcrJunk(m[2]!)) break
      s = m[1]!
    }
  }

  return s
}

function normalizeName(raw: string): string {
  const cleaned = raw
    .replace(/\s+/g, '')
    .replace(/[|丨｜]/g, '')
    .trim()
  return stripPlatformBadges(cleaned)
}

function looksLikeUiChrome(text: string): boolean {
  return UI_PATTERNS.some((p) => p.test(text))
}

function looksLikeCommentBody(text: string): boolean {
  if (text.length > MAX_NICK_LEN) return true
  if (text.length > 12 && /[，。！？、,.!?;；：:…]/.test(text)) return true
  if (/^(哈哈+|嘿嘿+|啊啊+|呜呜+|草+|好耶|冲了|冲鸭|支持|加油)/.test(text) && text.length >= 4) {
    return true
  }
  // emoji-heavy / punctuation-only
  if (/^[\d\s\-_/\\.~·•★☆♥❤]+$/.test(text)) return true
  return false
}

function isNicknameCandidate(text: string): boolean {
  const name = normalizeName(text)
  if (name.length < MIN_NICK_LEN || name.length > MAX_NICK_LEN) return false
  if (looksLikeUiChrome(name)) return false
  if (looksLikeCommentBody(name)) return false
  return true
}

/**
 * Comment UIs (Bilibili / XHS / Douyin) share a rough layout:
 *   [avatar] nickname ........ time/IP
 *            comment body...
 *            回复 / 赞
 *
 * Strategy: cluster boxes into vertical comment blocks, then score
 * short left-side lines at the top of each block as nicknames.
 */
export function suggestNicknamesFromLayout(lines: OcrLine[]): Set<string> {
  if (!lines.length) return new Set()

  const usable = lines
    .map((l) => ({ ...l, text: normalizeName(l.text) }))
    .filter((l) => l.text && l.score >= 0.45)
    .sort((a, b) => a.minY - b.minY || a.minX - b.minX)

  if (!usable.length) return new Set()

  // Estimate typical line height for clustering
  const heights = usable.map((l) => Math.max(0.008, l.maxY - l.minY)).sort((a, b) => a - b)
  const medianH = heights[Math.floor(heights.length / 2)] ?? 0.03
  const rowGap = Math.max(0.018, medianH * 1.35)
  const blockGap = Math.max(0.035, medianH * 2.4)

  // Cluster into comment blocks by vertical gaps
  const blocks: OcrLine[][] = []
  let current: OcrLine[] = []
  let prevBottom = -1

  for (const line of usable) {
    if (current.length && line.minY - prevBottom > blockGap) {
      blocks.push(current)
      current = []
    }
    current.push(line)
    prevBottom = Math.max(prevBottom, line.maxY)
  }
  if (current.length) blocks.push(current)

  const suggested = new Set<string>()

  for (const block of blocks) {
    const pick = pickNicknameFromBlock(block, rowGap)
    if (pick) suggested.add(pick)
  }

  // Fallback: if layout found almost nothing, use left-column short lines
  if (suggested.size === 0) {
    for (const line of usable) {
      if (!isNicknameCandidate(line.text)) continue
      const width = line.maxX - line.minX
      const cx = (line.minX + line.maxX) / 2
      if (line.minX < 0.48 && cx < 0.5 && width < 0.45 && line.text.length <= 14) {
        suggested.add(line.text)
      }
    }
  }

  return suggested
}

function pickNicknameFromBlock(block: OcrLine[], rowGap: number): string | null {
  const content = block.filter((l) => !looksLikeUiChrome(normalizeName(l.text)))
  if (!content.length) return null

  // Top row of the block (nickname + time usually sit here)
  const topY = Math.min(...content.map((l) => l.minY))
  const topRow = content.filter((l) => l.minY <= topY + rowGap)

  let best: { text: string; score: number } | null = null

  for (const line of topRow) {
    const text = normalizeName(line.text)
    if (!isNicknameCandidate(text)) continue

    const width = line.maxX - line.minX
    const cx = (line.minX + line.maxX) / 2
    let score = 0

    // Prefer short display names
    if (text.length <= 10) score += 3
    else if (text.length <= 14) score += 1
    else score -= 1

    // After avatar, left half
    if (line.minX >= 0.08 && line.minX <= 0.42) score += 3
    else if (line.minX < 0.55) score += 1

    // Not the right-side timestamp column
    if (cx > 0.62) score -= 4
    if (line.minX > 0.55) score -= 3

    // Narrow box more like a name than a paragraph
    if (width < 0.28) score += 2
    else if (width < 0.4) score += 1
    else if (width > 0.55) score -= 3

    // Having a longer line below in the same block strongly suggests this is the name row
    const below = content.some(
      (o) =>
        o.minY > line.maxY + 0.002 &&
        normalizeName(o.text).length >= Math.max(4, text.length) &&
        !looksLikeUiChrome(normalizeName(o.text)),
    )
    if (below) score += 3

    // OCR confidence
    score += line.score >= 0.8 ? 1 : 0

    if (!best || score > best.score) best = { text, score }
  }

  // Also consider first left short line in whole block if top-row scoring weak
  if (!best || best.score < 3) {
    const leftShort = content
      .filter((l) => {
        const t = normalizeName(l.text)
        return (
          isNicknameCandidate(t) &&
          l.minX < 0.45 &&
          l.maxX - l.minX < 0.42 &&
          (l.minX + l.maxX) / 2 < 0.5
        )
      })
      .sort((a, b) => a.minY - b.minY || a.minX - b.minX)[0]
    if (leftShort) {
      const t = normalizeName(leftShort.text)
      if (!best || best.score < 3) best = { text: t, score: 3 }
    }
  }

  return best && best.score >= 2 ? best.text : null
}

/** Build tappable boxes with layout suggestions pre-selected */
export function buildOcrBoxes(lines: OcrLine[]): OcrBox[] {
  const suggested = suggestNicknamesFromLayout(lines)
  const used = new Set<string>()

  return lines.map((line, i) => {
    const text = normalizeName(line.text)
    const canBeNick = isNicknameCandidate(text)
    // Only first occurrence of a suggested name is pre-selected
    const isSuggested = canBeNick && suggested.has(text) && !used.has(text.toLowerCase())
    if (isSuggested) used.add(text.toLowerCase())

    return {
      ...line,
      text: text || line.text.trim(),
      id: `box-${i}-${text.slice(0, 8)}`,
      suggested: isSuggested,
      // Pre-select layout suggestions; user can tap to fix
      selected: isSuggested,
    }
  })
}

export function artistNameSet(names: ArtistNames): Set<string> {
  const set = new Set<string>()
  for (const v of Object.values(names)) {
    const n = normalizeName(v)
    if (n) set.add(n.toLowerCase())
  }
  return set
}

export function isArtistName(name: string, names: ArtistNames): boolean {
  const n = normalizeName(name).toLowerCase()
  if (!n) return false
  return artistNameSet(names).has(n)
}

function makeId(name: string, source: Candidate['source']): string {
  return `${source}-${name}-${Math.random().toString(36).slice(2, 8)}`
}

export function mergeCandidates(
  existing: Candidate[],
  incoming: Array<{
    name: string
    selected: boolean
    lowConfidence: boolean
    source: Candidate['source']
  }>,
  artistNames: ArtistNames,
): Candidate[] {
  const map = new Map<string, Candidate>()

  for (const c of existing) {
    const key = normalizeName(c.name).toLowerCase()
    if (!key) continue
    map.set(key, { ...c, name: normalizeName(c.name) })
  }

  for (const item of incoming) {
    const name = normalizeName(item.name)
    if (!name) continue
    if (isArtistName(name, artistNames)) continue
    const key = name.toLowerCase()
    const prev = map.get(key)
    if (prev) {
      map.set(key, {
        ...prev,
        count: prev.count + 1,
        selected: prev.selected || item.selected,
        lowConfidence: prev.lowConfidence && item.lowConfidence,
      })
    } else {
      map.set(key, {
        id: makeId(name, item.source),
        name,
        selected: item.selected,
        lowConfidence: item.lowConfidence,
        source: item.source,
        count: 1,
      })
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
}

export function parsePastedNames(text: string): string[] {
  return text
    .split(/[\n,，;；\t]+/)
    .map((s) => normalizeName(s))
    .filter(Boolean)
}

export function selectedPool(candidates: Candidate[]): string[] {
  return candidates.filter((c) => c.selected).map((c) => c.name)
}

export { normalizeName, isNicknameCandidate }
