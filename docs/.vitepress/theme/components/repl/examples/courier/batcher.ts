export const batcherExample = {
  code: `import { createApi, createBatcher } from '/courier'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

// createBatcher coalesces individual load() calls made in the same scheduling
// window into a single resolve() call — eliminating N+1 request patterns.
const userLoader = createBatcher({
  resolve: async (ids: number[]) => {
    // In production this would be a batch endpoint like POST /users/batch.
    // JSONPlaceholder doesn't have one, so we fetch in parallel here to demo.
    return Promise.all(ids.map((id) => http.get('/users/' + id)))
  },
  maxSize: 10,  // force-flush when queue reaches 10
  window: 0,    // collect within the same microtask tick (default)
})

// These three load() calls collapse into ONE resolve() invocation
const [alice, bob, carol] = await Promise.all([
  userLoader.load(1),
  userLoader.load(2),
  userLoader.load(3),
])

console.log('Alice:', alice.name)
console.log('Bob:  ', bob.name)
console.log('Carol:', carol.name)
console.log('✓ Three loads resolved from one batch')

// After dispose(), any new load() rejects immediately
userLoader.dispose()
try {
  await userLoader.load(4)
} catch (err) {
  console.log('Post-dispose load rejected:', err.message)
}`,
  name: 'createBatcher - DataLoader Pattern',
};
