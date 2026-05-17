export const asyncPoolExample = {
  code: "import { queue } from '@vielzeug/toolkit'\n\nconst requestQueue = queue({ concurrency: 3 })\n\nconst tasks = Array.from({ length: 6 }, (_, index) =>\n  requestQueue.add(async () => {\n    console.log(`Task ${index + 1} started`)\n    await new Promise(resolve => setTimeout(resolve, 100))\n    return `Result ${index + 1}`\n  })\n)\n\nconst results = await Promise.all(tasks)\nawait requestQueue.onIdle()\nconsole.log('All results:', results)",
  name: 'queue - Parallel execution with concurrency limit',
};
