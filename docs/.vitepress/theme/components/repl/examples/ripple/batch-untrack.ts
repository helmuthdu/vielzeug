export const batchUntrackExample = {
  code: `import { signal, effect, batch, untrack } from '@vielzeug/ripple'

const a = signal(1)
const b = signal(2)

let effectRuns = 0
effect(() => {
  // Reading a and b makes them dependencies
  const sum = a.value + b.value
  effectRuns++
  console.log(\`Effect run #\${effectRuns}: sum = \${sum}\`)
})

// Without batch: each write triggers the effect
a.value = 10  // run #2
b.value = 20  // run #3

// Batch: flush only once after the block
batch(() => {
  a.value = 100
  b.value = 200
})  // run #4 (single run for both updates)

// untrack: read without registering dependency
effect(() => {
  const tracked = a.value        // tracked
  const peeked = untrack(() => b.value)  // NOT tracked
  console.log('peeked b:', peeked)
})

b.value = 999  // won't re-run the untrack effect`,
  name: 'Batch & Untrack',
};
