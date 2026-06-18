export const groupWithSignalExample = {
  code: `import { createWorker, task } from '@vielzeug/familiar'

const double = task((n) => new Promise(resolve => setTimeout(() => resolve(n * 2), 20)))
const pool = createWorker(double, { concurrency: 2 })

// --- group(signal): tie group lifetime to an external AbortSignal ---

// Tied to pool lifetime — group aborts automatically when pool disposes:
const g1 = pool.group('tied', { signal: pool.disposalSignal })
g1.run(1).catch(() => {})
g1.run(2).catch(() => {})
const results = await g1.drain()
console.log('Results:', results.map(r => r.status === 'fulfilled' ? r.value : 'rejected'))

// External controller — cancel group from outside:
const ac = new AbortController()
const slow = createWorker(
  task(() => new Promise(resolve => setTimeout(resolve, 100))),
  { concurrency: 1 },
)
const g2 = slow.group('external', { signal: ac.signal })
g2.run(undefined).catch(() => {})
const queued = g2.run(undefined)

ac.abort('user cancelled')

const outcome = await queued.catch(e => 'aborted: ' + e.name)
console.log('Queued task:', outcome)

// Pre-aborted signal — group is immediately in aborted state:
const alreadyAborted = AbortSignal.abort('pre-aborted')
const g3 = pool.group('pre-aborted', { signal: alreadyAborted })
const instant = await g3.run(42).catch(e => 'aborted immediately: ' + e.name)
console.log('Pre-aborted:', instant)

pool.dispose()
slow.dispose()`,
  name: 'Group with Signal',
};
