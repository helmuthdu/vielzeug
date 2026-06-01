export const basicWorkerExample = {
  code: `import { createWorker } from '@vielzeug/familiar'

// Single-slot worker (concurrency=1 by default)
const worker = createWorker((text) => text.toUpperCase())

console.log(await worker.run('hello'))
console.log(await worker.run('world'))

console.log('completed:', worker.completed)
worker.dispose()`,
  name: 'Basic Worker',
};
