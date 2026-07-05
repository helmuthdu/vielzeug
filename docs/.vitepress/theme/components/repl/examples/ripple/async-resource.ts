export const asyncResourceExample = {
  code: `import { signal, resource, effect } from '@vielzeug/ripple'

// Simulates a network request without needing a real endpoint
function fakeFetchUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id === 'missing') reject(new Error(\`user \${id} not found\`))
      else resolve({ id, name: \`User \${id}\` })
    }, 30)
  })
}

async function run() {
  const userId = signal('u1')

  // resource() tracks userId synchronously and re-runs the factory when it changes.
  // The factory receives an AbortSignal that fires when superseded or disposed.
  const user = resource((abortSignal) => fakeFetchUser(userId.value))

  const stop = effect(() => {
    const s = user.value
    if (s.status === 'loading') console.log('loading...')
    else if (s.status === 'error') console.log('error:', s.error.message)
    else console.log('ready:', s.data.name)
  })

  await new Promise((r) => setTimeout(r, 50))

  userId.value = 'missing' // aborts the in-flight fetch, re-runs — factory rejects
  await new Promise((r) => setTimeout(r, 50))

  userId.value = 'u1' // recovers
  await new Promise((r) => setTimeout(r, 50))

  user.refresh() // manual retry/refetch — same id, force a re-fetch without a dep change
  await new Promise((r) => setTimeout(r, 50))

  stop.dispose()
  user.dispose()
}

void run()`,
  name: 'Async Resource — fetch, errors & manual refresh',
};
