export const functionPipeExample = {
  code: `import { pipe } from '@vielzeug/arsenal'

// pipe: left-to-right function composition
const add5 = (n) => n + 5
const multiply2 = (n) => n * 2
const square = (n) => n * n

const transform = pipe(add5, multiply2, square)
console.log('transform(3):', transform(3)) // (3+5)*2 = 16, 16^2 = 256

// Works with string transformations too
const normalise = pipe(
  (s) => s.trim(),
  (s) => s.toLowerCase(),
  (s) => s.replace(/\\s+/g, '-'),
)
console.log('normalise result:', normalise('  Hello World  ')) // 'hello-world'

// Zero args returns the identity function
const id = pipe()
console.log('identity:', id(42)) // 42`,
  name: 'pipe - Left-to-right function composition',
};
