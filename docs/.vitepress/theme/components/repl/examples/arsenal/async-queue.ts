export const asyncQueueExample = {
  code: `import { taskPool } from '@vielzeug/arsenal/async'

const pool = taskPool({ concurrency: 2 })
const tasks = [100, 50, 75, 30].map((delay, index) =>
  pool.run(async (signal) => {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, delay)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(signal.reason)
      }, { once: true })
    })
    return 'task-' + (index + 1)
  }),
)

console.log('After enqueue:', { active: pool.active, pending: pool.pending })
console.log('Results:', await Promise.all(tasks))
await pool.idle()
pool.dispose()`,
  name: 'taskPool - Bounded concurrent work',
};
