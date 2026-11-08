const RELOAD_FLAG = 'fan-lottery-stale-reload'

/** True when browser is stuck on an old hashed chunk after a Pages redeploy. */
export function isStaleChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed/i.test(
    msg,
  )
}

/**
 * Unregister SW + wipe Cache Storage, then reload once per tab session.
 * Returns false if we already tried (caller should show manual instructions).
 */
export async function recoverFromStaleAssets(): Promise<boolean> {
  if (sessionStorage.getItem(RELOAD_FLAG) === '1') return false
  sessionStorage.setItem(RELOAD_FLAG, '1')

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    // still reload — often enough to pick up new HTML/JS
  }

  location.reload()
  return true
}
