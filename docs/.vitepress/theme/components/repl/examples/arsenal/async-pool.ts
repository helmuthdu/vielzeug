export const asyncPoolExample = {
  code: `import { taskPool } from '@vielzeug/arsenal/async'

const pool = taskPool({ concurrency: 3 })
const tasks = Array.from({ length: 6 }, (_, index) =>
  pool.run(async () => {
    console.log(\`Task \${index + 1} started\`)
    await new Promise(resolve => setTimeout(resolve, 100))
    return \`Result \${index + 1}\`
  }),
)

console.log('All results:', await Promise.all(tasks))
await pool.idle()
pool.dispose()`,
  name: 'taskPool - Parallel execution with concurrency limit',
};
