export const preloadAndDisposeExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

let fetchCount = 0

const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home:   { path: '/' },
    product: {
      path: '/products/:id',
      data: async ({ params }) => {
        fetchCount++
        return { id: params.id, name: 'Product ' + params.id, fetchCount }
      },
    },
    search: {
      path: '/search',
      data: async ({ query }) => {
        fetchCount++
        return { results: ['a', 'b', 'c'], q: query.q, fetchCount }
      },
    },
  },
})

// ── Preload with params (no query) ───────────────────────────────────────────
// Warm the data loader before navigation — simulates hover prefetch.
await router.preload('product', { id: '99' })
console.log('fetches after product preload:', fetchCount) // 1

// Navigate — data loader is NOT called again (cache hit).
await router.navigate({ name: 'product', params: { id: '99' } })
console.log('fetches after product navigate:', fetchCount) // still 1

// ── Preload with query param ──────────────────────────────────────────────────
// Pass the same query you intend to navigate with so the cache key matches.
await router.navigate({ path: '/' })
await router.preload('search', undefined, { q: 'hello' })
console.log('fetches after search preload:', fetchCount) // 2

// Navigate with the same query — cache hit, no extra fetch.
await router.navigate({ name: 'search', query: { q: 'hello' } })
console.log('fetches after search navigate:', fetchCount) // still 2
console.log('search data:', router.getSnapshot().matches.at(-1)?.data)

// ── Lifecycle ─────────────────────────────────────────────────────────────────
console.log('disposed before dispose():', router.disposed)
router.dispose()
console.log('disposed after dispose():', router.disposed)
console.log('disposalSignal aborted:', router.disposalSignal.aborted)`,
  name: 'Preload, waitFor, and Dispose',
};
