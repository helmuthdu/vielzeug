export const asyncParallelExample = {
  code: "import { parallel } from '@vielzeug/arsenal'\n\nconst items = [1, 2, 3, 4, 5, 6, 7, 8]\n\nconst results = await parallel(\n  items,\n  async item => {\n    console.log(`Processing: ${item}`)\n    await new Promise(resolve => setTimeout(resolve, 100))\n    return item * 2\n  },\n  { limit: 2 }\n)\n\nconsole.log('Results:', results)",
  name: 'parallel - Controlled parallel execution',
};
