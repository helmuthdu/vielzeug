export const lifecycleExample = {
  code: `// Source lifecycle: disposed, disposalSignal, ready() on disposed source
import { createRemoteSource, SourceDisposedError } from '@vielzeug/sourcerer'

const dataset = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: \`Item \${i + 1}\` }))

const source = createRemoteSource({
  autoFetch: false,
  fetch: async ({ limit, page }) => ({
    items: dataset.slice((page - 1) * limit, page * limit),
    total: dataset.length,
  }),
  limit: 4,
})

// --- Check disposed state ---
console.log('disposed before fetch:', source.disposed)        // false
console.log('signal aborted before fetch:', source.disposalSignal.aborted) // false

await source.refresh()
console.log('items:', source.current.length, '| total:', source.meta.totalItems)

// --- disposalSignal: wire into AbortSignal-aware APIs ---
source.disposalSignal.addEventListener('abort', () => {
  console.log('disposalSignal fired — source cleaned up')
})

source.dispose()

console.log('disposed after dispose():', source.disposed)           // true
console.log('signal aborted after dispose():', source.disposalSignal.aborted) // true

// --- ready() rejects immediately on disposed source ---
try {
  await source.ready()
} catch (err) {
  if (err instanceof SourceDisposedError) {
    console.log('ready() on disposed source:', err.message)
  }
}

// --- Double-dispose is safe ---
source.dispose()
console.log('double dispose: no throw')`,
  name: 'Source Lifecycle',
};
