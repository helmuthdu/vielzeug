export const groupAndAbortExample = {
  code: `import { createWorker } from '@vielzeug/familiar'

const pool = createWorker(
  (n) => new Promise(resolve => setTimeout(() => resolve(n * 2), 20)),
  { concurrency: 2 },
)

// --- group(): submit related tasks, drain or abort as a unit ---
const g = pool.group()

const p1 = g.run(1)
const p2 = g.run(2)
const p3 = g.run(3)

// Wait for all group tasks to settle
await g.drain()
console.log('Group results:', await p1, await p2, await p3)
console.log('Group size:', g.size)

// --- AbortController: cancel queued tasks ---
const slow = createWorker(
  () => new Promise(resolve => setTimeout(resolve, 100)),
  { concurrency: 1 },
)
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
