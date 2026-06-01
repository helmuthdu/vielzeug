export const lifecycleExample = {
  code: `import { createWorker } from '@vielzeug/familiar'

const pool = createWorker(
  (n) => new Promise(resolve => setTimeout(() => resolve(n), 20)),
  { concurrency: 2 },
)

// Metrics while running
const p1 = pool.run(1)
const p2 = pool.run(2)
pool.run(3).catch(() => {}) // will be in queue

await Promise.resolve() // yield to allow tasks to start
console.log('status:', pool.status)       // 'running'
console.log('active:', pool.active)       // 2
console.log('queued:', pool.queued)       // 1
console.log('utilization:', pool.utilization) // 1

await p1
await p2

// Graceful shutdown — drains remaining tasks then terminates
await pool.close()
console.log('status after close:', pool.status) // 'terminated'
console.log('completed:', pool.completed)`,
  name: 'Lifecycle & Metrics',
};
