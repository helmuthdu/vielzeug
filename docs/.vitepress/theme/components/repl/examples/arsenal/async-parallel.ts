export const asyncParallelExample = {
  code: `import { parallel } from '@vielzeug/arsenal'

const items = [1, 2, 3, 4, 5, 6, 7, 8]

const results = await parallel(
  items,
  async item => {
    console.log(\`Processing: \${item}\`)
    await new Promise(resolve => setTimeout(resolve, 100))
    return item * 2
  },
  { limit: 2 }
)

console.log('Results:', results)`,
  name: 'parallel - Controlled parallel execution',
};
