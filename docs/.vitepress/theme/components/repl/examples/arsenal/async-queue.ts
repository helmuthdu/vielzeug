export const asyncQueueExample = {
  code: "import { queue } from '@vielzeug/arsenal'\n\nconst taskQueue = queue({ concurrency: 1 })\n\nconst tasks = [\n  () => new Promise(resolve => setTimeout(() => resolve('Task 1'), 100)),\n  () => new Promise(resolve => setTimeout(() => resolve('Task 2'), 50)),\n  () => new Promise(resolve => setTimeout(() => resolve('Task 3'), 75)),\n]\n\nconsole.log('Starting queue...')\nconst results = await Promise.all(tasks.map(task => taskQueue.add(task)))\nawait taskQueue.onIdle()\nconsole.log('Queue completed:', results)",
  name: 'queue - Sequential async execution',
};
