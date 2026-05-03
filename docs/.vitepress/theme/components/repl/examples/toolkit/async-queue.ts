export const asyncQueueExample = {
  code: "import { queue } from '@vielzeug/toolkit'\n\nconst tasks = [\n  () => new Promise(r => setTimeout(() => r('Task 1'), 100)),\n  () => new Promise(r => setTimeout(() => r('Task 2'), 50)),\n  () => new Promise(r => setTimeout(() => r('Task 3'), 75))\n]\n\nconsole.log('Starting queue...')\nconst results = await queue(tasks)\nconsole.log('Queue completed:', results)",
  name: 'queue - Sequential async execution',
};
