export const queryClientBasicExample = {
  code: `import { createQuery, createApi } from '@vielzeug/courier'

// fetch() always throws on error; second call hits the cache within staleTime.
const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })
const qc = createQuery({ staleTime: 5_000, gcTime: 300_000 })

console.log('First fetch...')
const data1 = await qc.fetch({
  key: ['posts', 1],
  fn: ({ signal }) => http.get('/posts/{id}', { params: { id: 1 }, signal }),
})
console.log('Post:', data1.title)
console.log('Cache size:', qc.size)

console.log('Second fetch (cached)...')
const data2 = await qc.fetch({
  key: ['posts', 1],
  fn: ({ signal }) => http.get('/posts/{id}', { params: { id: 1 }, signal }),
})
console.log('Post:', data2.title)
console.log('✓ Second call hit the cache — no network request')

// set() writes data directly; get() reads it back without fetching
qc.set(['posts', 99], { id: 99, title: 'Seeded post', body: '', userId: 1 })
const seeded = qc.get(['posts', 99])
console.log('Seeded:', seeded.title, '| cache size:', qc.size)`,
  name: 'Query Client - Basic Caching',
};
