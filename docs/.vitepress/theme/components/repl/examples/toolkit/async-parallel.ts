export const asyncParallelExample = {
  code: "import { parallel } from '@vielzeug/toolkit'\n\nconst items = [1, 2, 3, 4, 5, 6, 7, 8]\n\n// Process 2 items at a time\nconst results = await parallel(2, items, async (item) => {\n  console.log(`Processing: ${item}`)\n  await new Promise(r => setTimeout(r, 100))\n  return item * 2\n})\n\nconsole.log('Results:', results)",
  name: 'parallel - Controlled parallel execution',
};
