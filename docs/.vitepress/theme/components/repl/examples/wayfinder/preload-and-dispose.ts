export const preloadAndDisposeExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

let fetchCount = 0

const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home:    { path: '/' },
    product: {
      path: '/products/:id',
      data: async ({ params }) => {
        fetchCount++
        return { id: params.id, name: 'Product ' + params.id, fetchCount }
      },
    },
  },
})

// Warm the data loader before navigation — simulates hover prefetch.
await router.preload('product', { id: '99' })
console.log('fetches after preload:', fetchCount) // 1

// Navigate to the same route — data loader is NOT called again (cache hit).
await router.navigate({ name: 'product', params: { id: '99' } })
console.log('fetches after navigate:', fetchCount) // still 1
console.log('data:', router.getSnapshot().matches.at(-1)?.data)

// waitFor() — useful in tests to await a specific route.
const nav = router.navigate({ path: '/' })
await router.waitFor('home')
console.log('settled on home:', router.getSnapshot().location.pathname)
await nav

// Lifecycle: disposed getter and disposal signal.
console.log('disposed before dispose():', router.disposed)
router.dispose()
console.log('disposed after dispose():', router.disposed)
console.log('disposalSignal aborted:', router.disposalSignal.aborted)`,
  name: 'Preload, waitFor, and Dispose',
};
