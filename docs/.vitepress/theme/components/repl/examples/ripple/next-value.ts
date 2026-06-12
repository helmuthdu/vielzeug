export const nextValueExample = {
  code: `import { signal, watch, untrack } from '@vielzeug/ripple'

// Bridge reactive state into async code with watch()
function waitFor(get, predicate) {
  return new Promise((resolve) => {
    const current = untrack(get)

    if (predicate(current)) {
      resolve(current)
      return
    }

    const stop = watch(get, (next) => {
      if (predicate(next)) {
        stop.dispose()
        resolve(next)
      }
    })
  })
}

async function run() {
  const status = signal('idle')

  const waitForDone = waitFor(() => status.value, (v) => v === 'done')

  // Simulate async state transitions
  setTimeout(() => { status.value = 'loading'; console.log('→ loading') }, 100)
  setTimeout(() => { status.value = 'done'; console.log('→ done') }, 300)

  const finalStatus = await waitForDone
  console.log('Resolved to:', finalStatus)

  // Await a simple next change
  const counter = signal(0)
  const next = waitFor(() => counter.value, (v) => v !== 0)
  counter.value = 42
  console.log('Next value:', await next)
}

void run()`,
  name: 'Async Workflows with watch()',
};
