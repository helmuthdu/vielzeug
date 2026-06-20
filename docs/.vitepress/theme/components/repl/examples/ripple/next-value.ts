export const nextValueExample = {
  code: `import { signal, computed, watch, untrack } from '@vielzeug/ripple'

// Bridge reactive state into async code with watch().
// watch() accepts a Reactive — use computed() for derived slices.
function waitFor(source, predicate) {
  return new Promise((resolve) => {
    const current = untrack(() => source.value)

    if (predicate(current)) {
      resolve(current)
      return
    }

    const stop = watch(source, (next) => {
      if (predicate(next)) {
        stop.dispose()
        resolve(next)
      }
    })
  })
}

async function run() {
  const status = signal('idle')

  const waitForDone = waitFor(status, (v) => v === 'done')

  // Simulate async state transitions
  setTimeout(() => { status.value = 'loading'; console.log('→ loading') }, 100)
  setTimeout(() => { status.value = 'done'; console.log('→ done') }, 300)

  const finalStatus = await waitForDone
  console.log('Resolved to:', finalStatus)

  // Await a simple next change
  const counter = signal(0)
  const next = waitFor(counter, (v) => v !== 0)
  counter.value = 42
  console.log('Next value:', await next)

  // For derived slices, wrap in computed() first
  const items = signal([1, 2, 3])
  const count = computed(() => items.value.length)
  const waitForFive = waitFor(count, (n) => n >= 5)
  items.value = [1, 2, 3, 4, 5]
  console.log('Count reached:', await waitForFive)
}

void run()`,
  name: 'Async Workflows with watch()',
};
