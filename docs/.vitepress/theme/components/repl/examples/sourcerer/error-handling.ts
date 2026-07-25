export const errorHandlingExample = {
  code: `// SourcererError, SourcererDisposedError, SourcererTimeoutError — typed error handling
import { createRemoteSource, SourcererDisposedError, SourcererError, SourcererTimeoutError } from '@vielzeug/sourcerer'

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

// --- SourcererTimeoutError: ready() timed out ---
const slow = createRemoteSource({
  autoFetch: false,
  fetch: () => new Promise(() => {}), // never resolves
})

slow.refresh()

try {
  await slow.ready(50) // 50 ms timeout
} catch (err) {
  if (err instanceof SourcererTimeoutError) {
    console.log('Timed out:', err.message)
  }
}

slow.dispose()

// --- SourcererDisposedError: disposed while waiting ---
const disposed = createRemoteSource({
  autoFetch: false,
  fetch: () => new Promise(() => {}),
})

disposed.refresh()

const waiting = disposed.ready().catch(err => {
  if (err instanceof SourcererDisposedError) {
    console.log('Disposed while waiting:', err.message)
  }
})

disposed.dispose()
await waiting`,
  name: 'Error Handling',
};
