export const disposalSignalExample = {
  code: `import { createWorker, task } from '@vielzeug/familiar'

const double = task((n) => new Promise(resolve => setTimeout(() => resolve(n * 2), 20)))
const pool = createWorker(double, { concurrency: 2 })

// disposalSignal ties external lifetimes to the pool
console.log('aborted before dispose:', pool.disposalSignal.aborted) // false

// Simulate binding an external resource to the pool's lifetime
pool.disposalSignal.addEventListener('abort', () => {
  console.log('Pool terminated — external resource cleaned up')
})

// Run some tasks
const p1 = pool.run(1)
const p2 = pool.run(2)
await Promise.all([p1, p2])
console.log('completed:', pool.completed) // 2

// dispose() aborts the signal
pool.dispose()
console.log('aborted after dispose:', pool.disposalSignal.aborted)  // true
console.log('disposed:', pool.disposed)                              // true
console.log('status:', pool.status)                                  // 'terminated'`,
  name: 'disposalSignal',
};
