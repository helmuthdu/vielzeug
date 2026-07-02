export const asyncWaitForExample = {
  code: `import { waitFor } from '@vielzeug/arsenal'

// Simulate a value that becomes ready after a short delay
let ready = false
setTimeout(() => { ready = true }, 200)

console.log('Waiting for ready...')
await waitFor(() => ready, { interval: 50, timeout: 2000 })
console.log('Ready!')

// Abort early with an external signal
const ac = new AbortController()
setTimeout(() => ac.abort(new Error('user cancelled')), 100)

try {
  await waitFor(() => false, {
    interval: 50,
    signal: ac.signal,
    timeout: 5000,
  })
} catch (err) {
  console.log('Aborted:', err.message) // 'user cancelled'
}`,
  name: 'waitFor - Poll until condition is true or timeout/abort fires',
};
