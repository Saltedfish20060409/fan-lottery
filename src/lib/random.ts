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
