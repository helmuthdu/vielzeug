export const errorHandlingExample = {
  code: `// SourcererError, SourceDisposedError, SourceTimeoutError — typed error handling
import { createRemoteSource, SourceDisposedError, SourcererError, SourceTimeoutError } from '@vielzeug/sourcerer'

// --- SourcererError: structured fetch failure ---
const failing = createRemoteSource({
  autoFetch: false,
  fetch: async () => { throw new Error('network down') },
})

await failing.refresh()

if (SourcererError.is(failing.meta.error)) {
  console.log('SourcererError.message:', failing.meta.error.message)
  console.log('SourcererError.cause:', (failing.meta.error.cause as Error).message)
}

failing.dispose()

// --- SourceTimeoutError: ready() timed out ---
const slow = createRemoteSource({
  autoFetch: false,
  fetch: () => new Promise(() => {}), // never resolves
})

slow.refresh()

try {
  await slow.ready(50) // 50 ms timeout
} catch (err) {
  if (err instanceof SourceTimeoutError) {
    console.log('Timed out:', err.message)
  }
}

slow.dispose()

// --- SourceDisposedError: disposed while waiting ---
const disposed = createRemoteSource({
  autoFetch: false,
  fetch: () => new Promise(() => {}),
})

disposed.refresh()

const waiting = disposed.ready().catch(err => {
  if (err instanceof SourceDisposedError) {
    console.log('Disposed while waiting:', err.message)
  }
})

disposed.dispose()
await waiting`,
  name: 'Error Handling',
};
