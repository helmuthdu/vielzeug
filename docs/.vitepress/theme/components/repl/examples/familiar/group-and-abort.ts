export const groupAndAbortExample = {
  code: `import { createWorker, task } from '@vielzeug/familiar'

const double = task((n) => new Promise(resolve => setTimeout(() => resolve(n * 2), 20)))
const pool = createWorker(double, { concurrency: 2 })

// --- group(): submit related tasks, drain or abort as a unit ---
const g = pool.group('my-batch')

const p1 = g.run(1)
const p2 = g.run(2)
const p3 = g.run(3)

// drain() returns PromiseSettledResult[] — all outcomes in submission order
const settled = await g.drain()
settled.forEach(r => console.log(r.status === 'fulfilled' ? r.value : r.reason))
console.log('Group name:', g.name)
console.log('Group size:', g.size)

// --- AbortController: cancel queued tasks ---
const slowFn = task(() => new Promise(resolve => setTimeout(resolve, 100)))
const slow = createWorker(slowFn, { concurrency: 1 })
const ac = new AbortController()
const running = slow.run(undefined)
const queued = slow.run(undefined, { signal: ac.signal })

ac.abort()

const abortResult = await queued.catch(e => e.name)
console.log('Aborted task threw:', abortResult)

await running
pool.dispose()
slow.dispose()`,
  name: 'Group & Abort',
};
