export const poolAndBatchExample = {
  code: `import { createWorker, task } from '@vielzeug/familiar'

const processChunk = task((input) => {
  // Self-contained task — no outer-scope references allowed
  const { data, chunkId } = input
  let result = 0
  for (let i = 0; i < data.length; i++) {
    result += Math.sqrt(data[i]) * Math.PI
  }
  return { chunkId, result: +result.toFixed(4) }
})

// Pre-spawn all 3 threads at startup to eliminate first-task latency
const pool = createWorker(processChunk, {
  concurrency: 3,  // 3 concurrent worker threads
  timeout: 5000,   // abort tasks after 5 seconds
})

await pool.prime()  // pre-spawn all 3 slots now

async function processChunks() {
  console.log('concurrency:', pool.concurrency)

  const chunks = [
    { chunkId: 'A', data: Array.from({ length: 1000 }, (_, i) => i) },
    { chunkId: 'B', data: Array.from({ length: 1000 }, (_, i) => i * 2) },
    { chunkId: 'C', data: Array.from({ length: 1000 }, (_, i) => i * 3) },
    { chunkId: 'D', data: Array.from({ length: 1000 }, (_, i) => i * 4) },
  ]

  // Kick off all 4; D will queue behind A/B/C
  const promises = chunks.map(c => pool.run(c))
  console.log('active:', pool.active)  // up to 3 — first 3 slots occupied
  console.log('queued:', pool.queued)  // 1 — D is waiting

  const results = await Promise.all(promises)
  results.forEach(r => console.log('Chunk', r.chunkId + ':', r.result))

  console.log('completed:', pool.completed)    // 4

  pool.dispose()
}

processChunks()`,
  name: 'createWorker - Pool',
};
