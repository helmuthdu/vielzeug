export const asyncPoolExample = {
  code: "import { pool } from '@vielzeug/toolkit'\n\nconst tasks = Array.from({ length: 10 }, (_, i) =>\n  async () => {\n    console.log(`Task ${i + 1} started`)\n    await new Promise(r => setTimeout(r, 100))\n    return `Result ${i + 1}`\n  }\n)\n\n// Run max 3 tasks in parallel\nconst results = await pool(3, tasks)\nconsole.log('All results:', results)",
  name: 'pool - Parallel execution with concurrency limit',
};
