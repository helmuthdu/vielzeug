export const basicSignalExample = {
  code: `import { signal, effect, computed, batch } from '@vielzeug/ripple'

// Create reactive signals
const count = signal(0)
const name = signal('World')

// Computed derives from signals automatically
const greeting = computed(() => \`Hello, \${name.value}! Count: \${count.value}\`)

// Effect re-runs when dependencies change
effect(() => {
  console.log('Greeting:', greeting.value)
})

// Updates trigger effects
count.value = 1
name.value = 'Alice'

// Batch multiple writes into one flush
batch(() => {
  count.value = 10
  name.value = 'Bob'
})
// Only one re-run after the batch`,
  name: 'Signal, Computed & Effect',
};
