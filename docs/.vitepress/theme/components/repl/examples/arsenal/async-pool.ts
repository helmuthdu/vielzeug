export const asyncPoolExample = {
  code: `import { queue } from '@vielzeug/arsenal'

const requestQueue = queue({ concurrency: 3 })

const tasks = Array.from({ length: 6 }, (_, index) =>
  requestQueue.add(async () => {
    console.log(\`Task \${index + 1} started\`)
    await new Promise(resolve => setTimeout(resolve, 100))
    return \`Result \${index + 1}\`
  })
)

const results = await Promise.all(tasks)
await requestQueue.onIdle()
console.log('All results:', results)`,
  name: 'queue - Parallel execution with concurrency limit',
};
