/** Crypto-backed fair random helpers */

function randomUint32(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]!
}

/** Uniform integer in [0, maxExclusive) */
export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  // Rejection sampling to avoid modulo bias
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive
  let x = randomUint32()
  while (x >= limit) x = randomUint32()
  return x % maxExclusive
}

/** Fisher–Yates shuffle (copy) */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

/** Pick `count` distinct winners from pool without replacement */
export function pickWinners(pool: readonly string[], count: number): string[] {
  if (pool.length === 0 || count <= 0) return []
  const n = Math.min(count, pool.length)
  return shuffle(pool).slice(0, n)
}

/** Weighted pick without replacement. weight <= 0 treated as 1. */
export function pickWeightedWinners(
  entries: readonly { name: string; weight: number }[],
  count: number,
): string[] {
  if (!entries.length || count <= 0) return []
  const bag = entries.map((e) => ({
    name: e.name,
    weight: Math.max(1, Math.floor(e.weight) || 1),
  }))
  const n = Math.min(count, bag.length)
  const out: string[] = []
  for (let k = 0; k < n; k++) {
    const total = bag.reduce((s, e) => s + e.weight, 0)
    let r = randomInt(total)
    let idx = 0
    for (let i = 0; i < bag.length; i++) {
      r -= bag[i]!.weight
      if (r < 0) {
        idx = i
        break
      }
    }
    out.push(bag[idx]!.name)
    bag.splice(idx, 1)
  }
  return out
}

/** Short public draw id, e.g. FL-8F3A2C */
export function makeDrawId(): string {
  const buf = new Uint8Array(3)
  crypto.getRandomValues(buf)
  const hex = [...buf].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `FL-${hex}`
}
