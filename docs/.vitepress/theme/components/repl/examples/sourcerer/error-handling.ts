export const errorHandlingExample = {
  code: `// SourceError, SourceDisposedError, SourceTimeoutError — typed error handling
import { createRemoteSource, SourceDisposedError, SourceError, SourceTimeoutError } from '@vielzeug/sourcerer'

// --- SourceError: structured fetch failure ---
const failing = createRemoteSource({
  autoFetch: false,
  fetch: async () => { throw new Error('network down') },
})

await failing.refresh()

if (failing.meta.error instanceof SourceError) {
  console.log('SourceError.message:', failing.meta.error.message)
  console.log('SourceError.cause:', (failing.meta.error.cause as Error).message)
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
