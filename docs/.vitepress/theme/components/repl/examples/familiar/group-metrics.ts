export const groupMetricsExample = {
  code: `import { createWorker, task } from '@vielzeug/familiar'

const pool = createWorker(task((n) => new Promise(resolve => setTimeout(() => resolve(n * 2), 20))), { concurrency: 4 })

// groupCount starts at 0
console.log('Initial groupCount:', pool.groupCount) // 0

const g1 = pool.group('batch-a')
const g2 = pool.group('batch-b')

console.log('After creating 2 groups:', pool.groupCount) // 2

// Submit tasks to both groups
g1.run(1)
g1.run(2)
g2.run(10)

// drain() resolves and closes the group (groupCount decrements)
await g1.drain()
console.log('After g1.drain():', pool.groupCount) // 1

// Tasks settling naturally also close the group
await g2.drain()
console.log('After g2.drain():', pool.groupCount) // 0

// groupCount is useful for detecting group leaks in long-running apps
const g3 = pool.group('leak-check')
g3.run(99)
// Oops — forgot to drain(). groupCount stays elevated until drain() is called.
console.log('Undrained group:', pool.groupCount) // 1

await g3.drain() // clean up
console.log('Cleaned up:', pool.groupCount) // 0

pool.dispose()`,
  name: 'Group Metrics (groupCount)',
};
