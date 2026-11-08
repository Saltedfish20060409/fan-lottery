import type { ArtistNames, Candidate, SourcePlatform } from '../types'

/**
 * 整框 UI / 平台控件：整段匹配才排除。
 * 故意不含「纯数字/纯字母/口语」——那些可以是真昵称。
 */
const UI_PATTERNS: RegExp[] = [
  /^回复/,
  /^点赞$/,
  /^展开/,
  /^收起$/,
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
  /^粉丝$/,
  // 整框徽章（不是昵称正文里的后缀）
  /^Lv\.?\s*[0-6]?$/i,
  /^等级[0-6]?$/,
  /^[lI1|][vV]?[0-6]?$/i,
  /^UL\.?\s*\d{0,2}$/i,
  /^UP\.?\s*\d{0,2}$/i,
  /^VIP\d*$/i,
  /^大会员$/,
  /^年费大会员$/,
  /^硬核会员$/,
  /^粉丝团$/,
  /^灯牌$/,
  /^博主$/,
  /^笔记作者$/,
  /^会员$/,
  // B 站等级图标有时被 OCR 成单个汉字数字
  /^[一二三四五六零]$/,
]

/** 中文昵称偏短；纯英文/数字昵称可以更长（如 AkibaNagihiko） */
const MAX_NICK_LEN = 18
const MAX_LATIN_NICK_LEN = 28
const MIN_NICK_LEN = 2

/**
 * 昵称末尾结构化徽章。覆盖 LV0–LV6 及常见 OCR 变体（全角已在 basicClean 归一）。
 * 不碰：作者/博主/会员/来了/粉丝团 等可能出现在真昵称里的词。
 */
const STRUCTURED_BADGE_SUFFIXES: RegExp[] = [
  // B 站等级：LV0–LV6 / Lv.6 / lv 6 / LVI(I当1) / lV6
  /Lv\.?\s*[0-6]$/i,
  /L[vV]\.?\s*[0-6]$/,
  /[lI|][vV]\.?\s*[0-6]$/,
  // OCR 把 1 认成 I/l/|：LV I / LVl / Lv|
  /Lv\.?\s*[Il|]$/i,
  // 无数字的粘连徽章：昵称LV / 昵称Lv.
  /Lv\.?$/i,
  /等级[0-6]$/,
  /等级$/,
  /UL\.?\s*\d{1,2}$/i,
  /UL\.?$/i,
  /UP\.?\s*\d{1,2}$/i,
  /UP\.?$/i,
  /年费大会员$/,
  /大会员$/,
  /硬核会员$/,
  /VIP\d*$/i,
]

/** Lv 图标常被 OCR 认成这些短后缀（9/G/E/l6/四 等） */
function isBadgeOcrJunk(suffix: string): boolean {
  return /^(?:[A-Za-z]|[0-9]|[A-Za-z][0-9]|[0-9][A-Za-z]|[lI1|][vV]|[lI|][vV]?[0-6]?|Lv\.?[0-6]?|等级[0-6]?|[一二三四五六零])$/i.test(
    suffix,
  )
}

function isLatinHandle(text: string): boolean {
  return /^[A-Za-z0-9_.\-]+$/.test(text)
}

function maxNickLenFor(text: string): number {
  return isLatinHandle(text) ? MAX_LATIN_NICK_LEN : MAX_NICK_LEN
}

function toHalfWidthAlnum(s: string): string {
  return s.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  )
}

function basicClean(raw: string): string {
  return toHalfWidthAlnum(raw.replace(/\s+/g, '').replace(/[|丨｜]/g, '')).trim()
}

function stripStructuredBadges(raw: string): { text: string; strippedSuffix?: string } {
  let s = raw
  const parts: string[] = []
  let changed = true
  while (changed) {
    changed = false
    for (const re of STRUCTURED_BADGE_SUFFIXES) {
      const m = s.match(re)
      if (!m || m.index === undefined) continue
      const next = s.slice(0, m.index)
      if (next.length < MIN_NICK_LEN) continue
      parts.push(s.slice(m.index))
      s = next
      changed = true
      break
    }
  }

  // LV 图标误读成「四/五/六」：
  // - 英文昵称后直接剥（Akiba四）
  // - 中文去掉后仍 ≥2 字才剥（「李四」→「李」太短会保留）
  const ideo = s.match(/^(.*?)([四五六零])$/)
  if (ideo && ideo[1]) {
    const next = ideo[1]
    if (next.length >= MIN_NICK_LEN) {
      parts.push(ideo[2]!)
      s = next
    }
  }

  return parts.length
    ? { text: s, strippedSuffix: parts.reverse().join('') }
    : { text: s }
}

/**
 * 尝试剥掉末尾 1～2 位「徽章误读」。
 * 中文昵称后的拉丁碎片，或任意昵称后的汉字数字等级误读。
 */
function stripTrailingOcrJunk(raw: string): {
  text: string
  strippedSuffix?: string
} {
  let s = raw
  let stripped: string | undefined

  if (/[\u4e00-\u9fff]/.test(s)) {
    for (let i = 0; i < 3; i++) {
      const m = s.match(/^(.+[\u4e00-\u9fff])([A-Za-z0-9]{1,2})$/)
      if (!m || m[1]!.length < MIN_NICK_LEN) break
      const suf = m[2]!
      // 两位纯数字更像昵称本身
      if (/^\d{2}$/.test(suf)) break
      if (!isBadgeOcrJunk(suf)) break
      stripped = (stripped ?? '') + suf
      s = m[1]!
    }
  }

  // 英文昵称 + 汉字数字徽章（与 structured 互补）
  const ideo = s.match(/^([A-Za-z0-9_.\-]{2,})([四五六零])$/)
  if (ideo) {
    stripped = (stripped ?? '') + ideo[2]!
    s = ideo[1]!
  }

  return stripped ? { text: s, strippedSuffix: stripped } : { text: s }
}

/** 名单去重/粘贴用：只去结构化徽章，不去模糊碎片（避免误伤真昵称） */
function normalizeName(raw: string): string {
  return stripStructuredBadges(basicClean(raw)).text
}

/**
 * OCR 框展示用：结构化徽章必去；模糊碎片会去，但保留 rawText 可恢复。
 */
export function cleanOcrNickname(raw: string): {
  text: string
  rawText: string
  strippedSuffix?: string
} {
  const rawText = basicClean(raw)
  const structured = stripStructuredBadges(rawText)
  const junk = stripTrailingOcrJunk(structured.text)
  const parts = [structured.strippedSuffix, junk.strippedSuffix].filter(Boolean)
  return {
    text: junk.text,
    rawText,
    strippedSuffix: parts.length ? parts.join('') : undefined,
  }
}

/** 末尾仍像等级误读时，名单页提示用户核对 */
export function looksLikeTrailingBadgeJunk(name: string): boolean {
  if (!/[\u4e00-\u9fff]/.test(name)) return false
  const m = name.match(/([A-Za-z0-9]{1,2})$/)
  if (!m) return false
  if (/^\d{2}$/.test(m[1]!)) return false
  return isBadgeOcrJunk(m[1]!)
}

function looksLikeUiChrome(text: string): boolean {
  return UI_PATTERNS.some((p) => p.test(text))
}

/**
 * 自动勾选时的软信号：明显像「一整句评论」才跳过。
 * 不再用口语词/语气助词/重复字/纯数字去杀候选。
 */
function looksLikeSentenceComment(text: string): boolean {
  if (text.length > maxNickLenFor(text)) return true
  if (/[，。！？、,.!?;；：:…]/.test(text)) return true
  return false
}

/** 可点选/可入选：只排除过短过长和平台 UI */
function isNicknameCandidate(text: string): boolean {
  const name = normalizeName(text)
  if (name.length < MIN_NICK_LEN || name.length > maxNickLenFor(name)) return false
  if (looksLikeUiChrome(name)) return false
  return true
}

/** 「显示全部文字框」：不做布局过滤，只挡空串和平台 UI */
export function isAnyOcrTextBox(text: string): boolean {
  const name = normalizeName(text) || text.replace(/\s+/g, '').trim()
  if (!name) return false
  if (looksLikeUiChrome(normalizeName(text) || name)) return false
  return true
}

/** 点选页默认露出哪些框：英文昵称允许更宽更长 */
export function isTappableOcrBox(box: {
  text: string
  selected: boolean
  suggested: boolean
  minX: number
  maxX: number
}): boolean {
  if (box.selected || box.suggested) return true
  if (!isNicknameCandidate(box.text)) return false
  if (box.minX > 0.58) return false
  const w = box.maxX - box.minX
  if (isLatinHandle(box.text)) {
    return w < 0.78 && box.text.length <= MAX_LATIN_NICK_LEN
  }
  return w < 0.62 && box.text.length <= MAX_NICK_LEN
}

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
  /** 展示/入选名单用（可能去掉疑似等级碎片） */
  text: string
  /** OCR 原文（空白规范化后） */
  rawText: string
  /** 若自动去掉了疑似等级碎片，这里是被去掉的那一段 */
  strippedSuffix?: string
  suggested: boolean
  selected: boolean
}

/**
 * Comment UIs (Bilibili / XHS / Douyin) share a rough layout:
 *   [avatar] nickname ........ time/IP
 *            comment body...
 *            回复 / 赞
 */
export function suggestNicknamesFromLayout(lines: OcrLine[]): Set<string> {
  if (!lines.length) return new Set()

  const usable = lines
    .map((l) => {
      const cleaned = cleanOcrNickname(l.text)
      return { ...l, text: cleaned.text }
    })
    .filter((l) => l.text && l.score >= 0.55)
    .sort((a, b) => a.minY - b.minY || a.minX - b.minX)

  if (!usable.length) return new Set()

  const heights = usable
    .map((l) => Math.max(0.008, l.maxY - l.minY))
    .sort((a, b) => a - b)
  const medianH = heights[Math.floor(heights.length / 2)] ?? 0.03
  const rowGap = Math.max(0.018, medianH * 1.35)
  const blockGap = Math.max(0.035, medianH * 2.4)

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

  return suggested
}

function pickNicknameFromBlock(block: OcrLine[], rowGap: number): string | null {
  const content = block.filter((l) => !looksLikeUiChrome(normalizeName(l.text)))
  if (!content.length) return null

  const topY = Math.min(...content.map((l) => l.minY))
  const topRow = content.filter((l) => l.minY <= topY + rowGap)

  let best: { text: string; score: number } | null = null

  for (const line of topRow) {
    const text = normalizeName(line.text)
    if (!isNicknameCandidate(text)) continue
    // 自动勾选仍避开「一整句」；短口语/数字/字母昵称可以勾
    if (looksLikeSentenceComment(text)) continue
    const latin = isLatinHandle(text)
    if (!latin && text.length > 12) continue
    if (latin && text.length > 22) continue

    const width = line.maxX - line.minX
    const cx = (line.minX + line.maxX) / 2
    let score = 0

    if (text.length <= 6) score += 3
    else if (text.length <= 10) score += 1
    else if (latin && text.length <= 16) score += 1

    // 昵称通常紧贴头像右侧
    if (line.minX >= 0.08 && line.minX <= 0.42) score += 4
    else if (line.minX < 0.5) score += 1
    else score -= 4

    if (cx > 0.55) score -= 5
    if (line.minX > 0.5) score -= 4

    if (width < 0.3) score += 2
    else if (width < 0.4) score += 1
    else if (width > 0.5 && !latin) score -= 4
    else if (width > 0.72 && latin) score -= 3

    const below = content.some(
      (o) =>
        o.minY > line.maxY + 0.002 &&
        normalizeName(o.text).length >= Math.max(3, Math.min(text.length, 4)) &&
        !looksLikeUiChrome(normalizeName(o.text)),
    )
    // 没有下方正文就不自动勾（减少把时间/点赞数当昵称）
    if (!below) continue
    score += 4

    score += line.score >= 0.85 ? 1 : 0
    score += line.score < 0.7 ? -2 : 0

    if (!best || score > best.score) best = { text, score }
  }

  return best && best.score >= 6 ? best.text : null
}

/** Build tappable boxes with layout suggestions pre-selected */
export function buildOcrBoxes(lines: OcrLine[]): OcrBox[] {
  const suggested = suggestNicknamesFromLayout(lines)
  const used = new Set<string>()

  return lines.map((line, i) => {
    const cleaned = cleanOcrNickname(line.text)
    const text = cleaned.text
    const canBeNick = isNicknameCandidate(text)
    const isSuggested =
      canBeNick && suggested.has(text) && !used.has(text.toLowerCase())
    if (isSuggested) used.add(text.toLowerCase())

    return {
      ...line,
      text: text || cleaned.rawText || line.text.trim(),
      rawText: cleaned.rawText || line.text.trim(),
      strippedSuffix: cleaned.strippedSuffix,
      id: `box-${i}-${text.slice(0, 8)}`,
      suggested: isSuggested,
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
    rawName?: string
    strippedSuffix?: string
    sourcePlatform?: SourcePlatform
    weight?: number
  }>,
  artistNames: ArtistNames,
): Candidate[] {
  const map = new Map<string, Candidate>()

  for (const c of existing) {
    const key = normalizeName(c.name).toLowerCase()
    if (!key) continue
    map.set(key, {
      ...c,
      name: normalizeName(c.name),
      weight: Math.max(1, c.weight ?? c.count ?? 1),
      sourcePlatform: c.sourcePlatform ?? 'unknown',
    })
  }

  for (const item of incoming) {
    const name = normalizeName(item.name)
    if (!name) continue
    if (isArtistName(name, artistNames)) continue
    const key = name.toLowerCase()
    const prev = map.get(key)
    const platform = item.sourcePlatform ?? 'unknown'
    if (prev) {
      const count = prev.count + 1
      const weightFollowsCount = prev.weight === prev.count
      map.set(key, {
        ...prev,
        count,
        // 未手动改过权重时，跟随出现次数
        weight: weightFollowsCount ? count : prev.weight,
        selected: prev.selected || item.selected,
        lowConfidence: prev.lowConfidence && item.lowConfidence,
        rawName: prev.rawName || item.rawName,
        strippedSuffix: prev.strippedSuffix || item.strippedSuffix,
        sourcePlatform:
          prev.sourcePlatform !== 'unknown' ? prev.sourcePlatform : platform,
      })
    } else {
      const count = 1
      map.set(key, {
        id: makeId(name, item.source),
        name,
        selected: item.selected,
        lowConfidence: item.lowConfidence,
        source: item.source,
        count,
        weight: Math.max(1, item.weight ?? count),
        sourcePlatform: platform,
        rawName: item.rawName,
        strippedSuffix: item.strippedSuffix,
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

export function selectedEntries(
  candidates: Candidate[],
): Array<{ name: string; weight: number }> {
  return candidates
    .filter((c) => c.selected)
    .map((c) => ({ name: c.name, weight: Math.max(1, c.weight ?? c.count ?? 1) }))
}

export { normalizeName, isNicknameCandidate }
