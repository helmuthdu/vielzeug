export const priorityQueueExample = {
  code: `import { createWorker, task } from '@vielzeug/familiar'

// concurrency=1: a blocker holds the slot while we observe priority ordering
const fn = task(async (n) => {
  if (n === -1) await new Promise(r => setTimeout(r, 30))
  return n
})
const pool = createWorker(fn, { concurrency: 1 })

const order = []
const record = (v) => { order.push(v); return v }

const blocker = pool.run(-1)
const low  = pool.run(1, { priority: 1 }).then(record)
const high = pool.run(3, { priority: 3 }).then(record)
const mid  = pool.run(2, { priority: 2 }).then(record)

await blocker
await Promise.all([low, mid, high])

// Tasks ran highest → lowest priority, not submission order
console.log('Completion order:', order) // [3, 2, 1]
pool.dispose()`,
  name: 'Priority Queue',
};
