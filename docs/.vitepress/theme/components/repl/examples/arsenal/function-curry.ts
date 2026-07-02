export const functionRunAllExample = {
  code: `import { runAll } from '@vielzeug/arsenal'

// Run every teardown function — collect errors instead of stopping on first failure
const log = []

const teardowns = [
  () => { log.push('cleanup A'); },
  () => { log.push('cleanup B'); throw new Error('B failed'); },
  () => { log.push('cleanup C'); },
]

try {
  runAll(teardowns, { reverse: true }) // LIFO order matches setup-teardown semantics
} catch (err) {
  console.log('errors collected:', err instanceof AggregateError)  // true
  console.log('error count:', err.errors.length)                   // 1
  console.log('still ran:', log)  // ['cleanup C', 'cleanup B', 'cleanup A']
}

// Without failures — just runs all in order
const steps = []
runAll([() => steps.push(1), () => steps.push(2), () => steps.push(3)])
console.log('steps:', steps)  // [1, 2, 3]`,
  name: 'runAll - Run all callbacks, collect errors',
};
