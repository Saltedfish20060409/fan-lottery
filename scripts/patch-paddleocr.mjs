/**
 * Mobile WASM often needs >60s to create the detection ONNX session.
 * Also "all" graph opts make first init much slower on CPU/WASM.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const targets = [
  join(root, 'node_modules/@paddleocr/paddleocr-js/dist/index.mjs'),
  join(
    root,
    'node_modules/@paddleocr/paddleocr-js/dist/assets/worker-entry-C9UNuyOJ.js',
  ),
]

for (const file of targets) {
  let src = readFileSync(file, 'utf8')
  const before = src
  // 60s -> 180s session create timeout
  src = src.replaceAll(
    'createSession(ort, modelBytes, providerCandidates), 6e4,',
    'createSession(ort, modelBytes, providerCandidates), 18e4,',
  )
  src = src.replaceAll(
    'createSession(ort, modelBytes, providerCandidates), 6e4, "Detection model"',
    'createSession(ort, modelBytes, providerCandidates), 18e4, "Detection model"',
  )
  // Faster first-load on mobile WASM
  src = src.replaceAll(
    'graphOptimizationLevel: "all"',
    'graphOptimizationLevel: "basic"',
  )
  if (src !== before) {
    writeFileSync(file, src)
    console.log(`patched ${file}`)
  } else {
    console.log(`already patched or pattern missing: ${file}`)
  }
}
