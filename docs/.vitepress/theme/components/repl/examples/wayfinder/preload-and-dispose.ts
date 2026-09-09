export const preloadAndDisposeExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

let fetchCount = 0

const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home: { path: '/' },
    product: {
      path: '/products/:id',
      data: async ({ params }) => {
        fetchCount++
        return { id: params.id, fetchCount }
      },
    },
    search: {
      path: '/search',
      data: async ({ query }) => {
        fetchCount++
        return { q: query.q, fetchCount }
      },
    },
  },
})

await router.preload({ name: 'product', params: { id: '99' } })
console.log('fetches after preload:', fetchCount)

await router.navigate({ name: 'product', params: { id: '99' } })
console.log('fetches after navigation:', fetchCount)

await router.navigate({ name: 'home' })
await router.preload({ name: 'search', query: { q: 'hello' } })
await router.navigate({ name: 'search', query: { q: 'hello' } })
console.log('fetches after query preload and navigation:', fetchCount)
console.log('search data:', router.getSnapshot().matches.at(-1)?.data)

console.log('disposed before:', router.disposed)
router.dispose()
console.log('disposed after:', router.disposed)
console.log('signal aborted:', router.disposalSignal.aborted)`,
  name: 'Preload Cache and Dispose',
};
