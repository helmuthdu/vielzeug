export const asyncQueueExample = {
  code: `import { queue } from '@vielzeug/arsenal'

// concurrency: 2 — at most 2 tasks run simultaneously
const taskQueue = queue({ concurrency: 2 })

const tasks = [
  () => new Promise(resolve => setTimeout(() => resolve('Task 1'), 100)),
  () => new Promise(resolve => setTimeout(() => resolve('Task 2'), 50)),
  () => new Promise(resolve => setTimeout(() => resolve('Task 3'), 75)),
  () => new Promise(resolve => setTimeout(() => resolve('Task 4'), 30)),
]

console.log('Starting queue...')

const promises = tasks.map(task => taskQueue.add(task))

// active = running, pending = waiting, size = active + pending
console.log(\`After enqueue — active: \${taskQueue.active}, pending: \${taskQueue.pending}, size: \${taskQueue.size}\`)

const results = await Promise.all(promises)
await taskQueue.onIdle()

console.log('Queue idle — size:', taskQueue.size)
console.log('Results:', results)`,
  name: 'queue - Concurrent execution with active/pending tracking',
};
