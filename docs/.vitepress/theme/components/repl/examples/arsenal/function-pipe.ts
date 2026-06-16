export const functionPipeExample = {
  code: "import { pipe } from '@vielzeug/arsenal'\n\n// pipe: left-to-right function composition\nconst add5 = (n) => n + 5\nconst multiply2 = (n) => n * 2\nconst square = (n) => n * n\n\nconst transform = pipe(add5, multiply2, square)\nconsole.log('transform(3):', transform(3)) // (3+5)*2 = 16, 16^2 = 256\n\n// Works with string transformations too\nconst normalise = pipe(\n  (s) => s.trim(),\n  (s) => s.toLowerCase(),\n  (s) => s.replace(/\\s+/g, '-'),\n)\nconsole.log('normalise result:', normalise('  Hello World  ')) // 'hello-world'\n\n// Zero args returns the identity function\nconst id = pipe()\nconsole.log('identity:', id(42)) // 42",
  name: 'pipe - Left-to-right function composition',
};
