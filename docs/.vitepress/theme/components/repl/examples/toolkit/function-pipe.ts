export const functionPipeExample = {
  code: "import { pipe, compose } from '@vielzeug/toolkit'\n\nconst add5 = (n) => n + 5\nconst multiply2 = (n) => n * 2\nconst square = (n) => n * n\n\n// Pipe: left to right\nconst pipeResult = pipe(\n  () => 3,\n  add5,      // 3 + 5 = 8\n  multiply2, // 8 * 2 = 16\n  square     // 16 * 16 = 256\n)\n\nconsole.log('Pipe result:', pipeResult())\n\n// Compose: right to left\nconst composeResult = compose(\n  square,     // last\n  multiply2,\n  add5        // first\n)\n\nconsole.log('Compose result:', composeResult(3)) // Same result",
  name: 'pipe - Compose functions',
};
