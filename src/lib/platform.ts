import type { SourcePlatform } from '../types'

/** Weak guess from OCR chrome text on a screenshot page. */
export function guessPlatformFromTexts(texts: string[]): SourcePlatform {
  const blob = texts.join('\n')
  if (/IP\s*属地|大会员|硬核会员|粉丝团|灯牌|Lv\.?\s*[0-6]|等级[0-6]/i.test(blob)) {
    return 'bilibili'
  }
  if (/说点什么|笔记作者|小红书/.test(blob)) {
    return 'xiaohongshu'
  }
  if (/抖音|抖音商城/.test(blob)) {
    return 'douyin'
  }
  return 'unknown'
}
